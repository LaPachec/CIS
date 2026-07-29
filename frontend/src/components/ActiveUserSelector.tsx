import { useActiveUser } from '../contexts/useActiveUser'

export function ActiveUserSelector() {
  const { experts, activeUserId, activeUser, setActiveUserId } = useActiveUser()

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">
          Usuário ativo
        </p>
        <strong className="text-sm text-slate-950">
          {activeUser
            ? `${activeUser.name} (${activeUser.role})`
            : 'Nenhum avaliador cadastrado'}
        </strong>
      </div>
      <label className="text-sm md:min-w-80">
        <span className="sr-only">Selecionar usuário ativo</span>
        <select
          value={activeUserId ?? ''}
          onChange={(event) =>
            setActiveUserId(event.target.value ? Number(event.target.value) : null)
          }
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Selecione</option>
          {experts.map((expert) => (
            <option key={expert.id} value={expert.id}>
              {expert.name} - {expert.role}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
