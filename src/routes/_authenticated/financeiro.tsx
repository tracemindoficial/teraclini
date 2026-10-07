import { createFileRoute } from '@tanstack/react-router';
import { FinancePage } from '@/components/finance/FinancePage';
import { financeOptions } from '@/lib/data/finance';
export const Route=createFileRoute('/_authenticated/financeiro')({
 loader:({context})=>context.queryClient.ensureQueryData(financeOptions()),
 head:()=>({meta:[{title:'Financeiro profissional — TeraClini'},{name:'description',content:'Recebimentos, saldos e histórico financeiro da sua prática profissional.'},{property:'og:title',content:'Financeiro profissional — TeraClini'},{property:'og:description',content:'Recebimentos, saldos e histórico financeiro da sua prática profissional.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:FinancePage,
 errorComponent:({error})=><div role="alert" className="p-6 text-sm text-destructive">{error instanceof Error ? error.message : 'Não foi possível abrir o financeiro.'}</div>,
 notFoundComponent:()=> <p className="p-6">Financeiro não encontrado.</p>,
});
