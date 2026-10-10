-- One Northfold site with an empty v0 (original site) set live.

insert into sites (name, url, site_key, preview_token, github_repo)
values ('Northfold', 'http://localhost:5500', 'pw_live_c6a694dd6e73e913', 'a5194d13273c3dde8f086ed5d6bd2b88', 'keithdmonte/northfold_store');

insert into versions (site_id, number, patches, note)
select id, 0, '[]', 'Original site' from sites where site_key = 'pw_live_c6a694dd6e73e913';

update sites set live_version_id = versions.id
from versions
where versions.site_id = sites.id and versions.number = 0 and sites.site_key = 'pw_live_c6a694dd6e73e913';
