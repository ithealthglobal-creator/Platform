-- Seed Market folder structure inside the Knowledge base for the IThealth root admin.
-- Replaces the former Growth > Market sub-nav with a folder tree of markdown docs.
--
-- Layout:
--   Market/
--     Verticals/   -> Verticals (doc)
--     Personas/    -> Personas (doc)
--     Pains/       -> Pains (doc)
--     Gains/       -> Gains (doc)
--     Testimonials/-> Testimonials (doc)

-- Folders
insert into public.knowledge_folders (id, company_id, parent_id, name, sort_order, created_by)
values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', null,                                       'Market',       1, null),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',     'Verticals',    1, null),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',     'Personas',     2, null),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',     'Pains',        3, null),
  ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',     'Gains',        4, null),
  ('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',     'Testimonials', 5, null)
on conflict (id) do nothing;

-- One starter document per sub-folder
insert into public.knowledge_documents (id, company_id, folder_id, title, content, sort_order, created_by)
values
  (
    '41000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    'Verticals',
    E'# Verticals\n\nIndustries and sectors we serve. Capture the unique context, terminology, and buying behaviour of each vertical here.\n\n## Items\n\n- Add a heading per vertical (e.g. `## Healthcare`, `## Legal`).\n- Note the regulatory landscape, common tech stack, and typical decision-makers.\n',
    1,
    null
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    'Personas',
    E'# Personas\n\nThe people we sell to. Capture role, motivations, and objections for each archetype.\n\n## Items\n\n- Add a heading per persona (e.g. `## IT Director`, `## Practice Manager`).\n- Include goals, frustrations, and what success looks like for them.\n',
    1,
    null
  ),
  (
    '41000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000004',
    'Pains',
    E'# Pains\n\nProblems and frustrations our personas experience that our services address.\n\n## Items\n\n- Add a heading per pain (e.g. `## Unreliable backups`).\n- Note the symptom, the underlying cause, and which services relieve it.\n',
    1,
    null
  ),
  (
    '41000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',
    'Gains',
    E'# Gains\n\nDesired outcomes and benefits our personas pursue.\n\n## Items\n\n- Add a heading per gain (e.g. `## Audit-ready security`).\n- Describe the outcome, who values it, and which services deliver it.\n',
    1,
    null
  ),
  (
    '41000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000006',
    'Testimonials',
    E'# Testimonials\n\nCustomer quotes and case-study snippets we can reuse in marketing and sales.\n\n## Items\n\n- Add one entry per testimonial. Include the quote, the speaker''s name, role, and company.\n- Tag with the vertical or service the quote relates to.\n',
    1,
    null
  )
on conflict (id) do nothing;
