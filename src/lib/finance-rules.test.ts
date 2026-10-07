import { describe, it, expect } from 'vitest';
import { moneyCents, financeBalance, allocateCents, packageDates, contractedTotal } from './finance-rules';
describe('professional finance rules', () => {
 it('records decimal money in exact cents', () => expect(moneyCents('720,00')).toBe(72000));
 it('rejects fractional cents', () => expect(() => moneyCents('10.001')).toThrow());
 it('720 contracted minus 300 confirmed is 420 partial', () => expect(financeBalance(72000,[{amount_cents:30000,status:'confirmed'}])).toEqual({received:30000,balance:42000,status:'partial'}));
 it('720 confirmed settles 720', () => expect(financeBalance(72000,[{amount_cents:72000,status:'confirmed'}])).toEqual({received:72000,balance:0,status:'paid'}));
 it('pending never counts as received', () => expect(financeBalance(72000,[{amount_cents:72000,status:'pending'}])).toEqual({received:0,balance:72000,status:'pending'}));
 it('reversal removes receipt from totals', () => expect(financeBalance(72000,[{amount_cents:30000,status:'reversed'}]).received).toBe(0));
 it('cancelled title remains cancelled', () => expect(financeBalance(72000,[],true).status).toBe('cancelled'));
 it('allocates four sessions without losing cents', () => expect(allocateCents(72001,4)).toEqual([18001,18000,18000,18000]));
 it('allocates eight sessions exactly', () => expect(allocateCents(72001,8).reduce((s,v)=>s+v,0)).toBe(72001));
 it('generates four weekly sessions', () => expect(packageDates('2026-10-01','09:00',4,7).map(s=>s.date)).toEqual(['2026-10-01','2026-10-08','2026-10-15','2026-10-22']));
 it('generates eight fortnightly sessions', () => expect(packageDates('2026-10-01','09:00',8,14).at(-1)?.date).toBe('2027-01-07'));
 it('preserves offer total for same quantity', () => expect(contractedTotal(72001,4,4,0).total).toBe(72001));
 it('uses current offer with negotiated discount', () => expect(contractedTotal(18000,null,8,8000)).toEqual({unit:18000,total:136000}));
});
