import { AlertTriangle, Database, Download, RefreshCcw, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import { downloadFile } from '../lib/downloadFile'

type BackupStatus = {
  databasePath: string
  exists: boolean
  sizeBytes: number
  sizeFormatted: string
  lastModified: string
}

type RestoreResponse = {
  message: string
  backupBeforeRestore: string
}

export function BackupPage() {
  const { activeUserId, activeUserRole } = useActiveUser()
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [restoreConfirmationOpen, setRestoreConfirmationOpen] = useState(false)

  const canDownloadBackup =
    activeUserRole === 'ADMIN' || activeUserRole === 'SUPERVISOR'
  const canRestoreBackup = activeUserRole === 'ADMIN'

  useEffect(() => {
    if (!canDownloadBackup) {
      setStatus(null)
      return
    }

    loadStatus()
  }, [canDownloadBackup])

  function getAuthHeaders() {
    return {
      'x-user-id': String(activeUserId ?? ''),
      'x-user-role': activeUserRole ?? '',
    }
  }

  async function loadStatus() {
    setLoading(true)
    setError('')

    try {
      const response = await api.get<BackupStatus>('/backup/status', {
        headers: getAuthHeaders(),
      })
      setStatus(unwrapData(response))
    } catch (errorResponse) {
      setError(getBackupErrorMessage(errorResponse))
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  async function downloadBackup() {
    if (!canDownloadBackup) {
      setError('Você não tem permissão para realizar esta ação.')
      return
    }

    setDownloading(true)
    setError('')
    setSuccess('')

    try {
      await downloadFile(
        '/backup/download',
        'cis-simulado-backup.sqlite',
        getAuthHeaders(),
      )
      setSuccess('Backup gerado com sucesso.')
      await loadStatus()
    } catch (errorResponse) {
      setError(getBackupErrorMessage(errorResponse))
    } finally {
      setDownloading(false)
    }
  }

  function requestRestoreBackup() {
    if (!canRestoreBackup) {
      setError('Você não tem permissão para realizar esta ação.')
      return
    }

    if (!selectedFile) {
      setError('Arquivo inválido ou não enviado.')
      return
    }

    setRestoreConfirmationOpen(true)
  }

  async function restoreBackup() {
    if (!selectedFile) {
      setRestoreConfirmationOpen(false)
      setError('Arquivo inválido ou não enviado.')
      return
    }

    setRestoreConfirmationOpen(false)
    setRestoring(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await api.post<RestoreResponse>(
        '/backup/restore',
        formData,
        { headers: getAuthHeaders() },
      )
      const result = unwrapData(response)
      setSuccess(
        `${result.message} Backup anterior: ${result.backupBeforeRestore}. Reinicie o servidor para garantir que todos os dados sejam recarregados corretamente.`,
      )
      setSelectedFile(null)
      await loadStatus()
    } catch (errorResponse) {
      setError(getBackupErrorMessage(errorResponse))
    } finally {
      setRestoring(false)
    }
  }

  if (!canDownloadBackup) {
    return (
      <section>
        <PageHeader
          title="Backup"
          description="Rotinas administrativas de backup e restauração do banco."
        />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Você não tem permissão para realizar esta ação.
        </div>
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        title="Backup"
        description="Gere uma cópia do SQLite atual ou restaure um backup existente."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Database size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-950">
              Status do Banco
            </h2>
          </div>

          {loading && <Loading />}

          {!loading && status && (
            <dl className="space-y-3 text-sm">
              <InfoRow label="Caminho" value={status.databasePath} />
              <InfoRow label="Existe" value={status.exists ? 'Sim' : 'Não'} />
              <InfoRow label="Tamanho" value={status.sizeFormatted} />
              <InfoRow
                label="Última modificação"
                value={formatDateTime(status.lastModified)}
              />
            </dl>
          )}

          <button
            type="button"
            onClick={loadStatus}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={16} />
            Atualizar status
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Download size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-950">
              Gerar Backup
            </h2>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Baixe uma cópia completa do banco SQLite atual.
          </p>
          <button
            type="button"
            onClick={downloadBackup}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            {downloading ? 'Gerando...' : 'Baixar backup do banco'}
          </button>
        </div>

        {canRestoreBackup && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Upload size={18} className="text-amber-600" />
              <h2 className="text-base font-semibold text-slate-950">
                Restaurar Backup
              </h2>
            </div>

            <div className="mb-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>
                A restauração substituirá o banco atual. Antes da restauração,
                o sistema criará uma cópia automática do banco existente.
              </p>
            </div>

            <label className="mb-4 block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Arquivo .sqlite ou .db
              </span>
              <input
                type="file"
                accept=".sqlite,.db"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700"
              />
            </label>

            <button
              type="button"
              onClick={requestRestoreBackup}
              disabled={restoring || !selectedFile}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={16} />
              {restoring ? 'Restaurando...' : 'Restaurar banco'}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={restoreConfirmationOpen}
        title="Restaurar backup"
        description="Essa ação substituirá os dados atuais. Antes da restauração, o sistema criará uma cópia automática do banco existente."
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setRestoreConfirmationOpen(false)}
        onConfirm={() => {
          void restoreBackup()
        }}
      />
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function getBackupErrorMessage(error: unknown) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response
      ? error.response.status
      : undefined

  if (status === 403) {
    return 'Você não tem permissão para realizar esta ação.'
  }

  if (status === 400) {
    return 'Arquivo inválido ou não enviado.'
  }

  if (status === 404) {
    return 'Banco de dados não encontrado.'
  }

  return 'Erro ao processar backup.'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
