locals {
  service_account_name_prefix = "movies-api-sa"
}

resource "yandex_iam_service_account" "movies_api_sa" {
  name        = "${local.service_account_name_prefix}-${local.folder_id}"
  description = "Service account to call movies-api-container and movies-database"
}

resource "yandex_iam_service_account_static_access_key" "movies_api_sa_static_key" {
  service_account_id = yandex_iam_service_account.movies_api_sa.id
}

output "movies_api_sa_id" {
  value = yandex_iam_service_account.movies_api_sa.id
}
