DROP POLICY IF EXISTS "members can read accounts" ON public.accounts;
DROP POLICY IF EXISTS "owners can update accounts" ON public.accounts;

CREATE POLICY "active members can read accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = accounts.id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);

CREATE POLICY "active owners can update account name"
ON public.accounts
FOR UPDATE
TO authenticated
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.account_members am
    JOIN public.user_roles ur
      ON ur.account_id = am.account_id
     AND ur.user_id = am.user_id
    WHERE am.account_id = accounts.id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
      AND ur.role = 'owner'
  )
)
WITH CHECK (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.account_members am
    JOIN public.user_roles ur
      ON ur.account_id = am.account_id
     AND ur.user_id = am.user_id
    WHERE am.account_id = accounts.id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
      AND ur.role = 'owner'
  )
);

COMMENT ON POLICY "active owners can update account name" ON public.accounts IS 'Authenticated owners can update only granted columns; account status remains service-role controlled.';