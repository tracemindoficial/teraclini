ALTER TABLE public.audit_events
  DROP CONSTRAINT audit_events_action_check;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_action_check
  CHECK (action = ANY (ARRAY[
    'created'::text,
    'updated'::text,
    'archived'::text,
    'deleted'::text,
    'submitted'::text,
    'review_updated'::text,
    'approved'::text,
    'rejected'::text
  ]));