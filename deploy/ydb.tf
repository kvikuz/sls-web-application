locals {
  database_name = "movies-database"
}

resource "yandex_ydb_database_serverless" "movies_database" {
  name      = local.database_name
  folder_id = local.folder_id
}

output "movies_database_document_api_endpoint" {
  value = yandex_ydb_database_serverless.movies_database.document_api_endpoint
}

output "movies_database_path" {
  value = yandex_ydb_database_serverless.movies_database.database_path
}
