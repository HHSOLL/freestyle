create index if not exists jobs_status_run_after_priority_created_idx
on jobs(status, run_after, priority, created_at);

create index if not exists jobs_job_type_status_run_after_idx
on jobs(job_type, status, run_after);

create index if not exists products_user_created_desc_idx
on products(user_id, created_at desc);

create index if not exists product_images_product_selected_score_idx
on product_images(product_id, is_selected desc, score desc);

create index if not exists assets_user_status_created_desc_idx
on assets(user_id, status, created_at desc);

create index if not exists outfit_evaluations_user_created_desc_idx
on outfit_evaluations(user_id, created_at desc);

create index if not exists tryons_user_created_desc_idx
on tryons(user_id, created_at desc);

create index if not exists outfits_share_slug_idx
on outfits(share_slug);

create index if not exists outfits_public_idx
on outfits(is_public);
