locals {
  import_function_name = "import-function"
  import_trigger_name  = "import-trigger"
}

resource yandex_function import_function {
  name               = local.import_function_name
  user_hash          = uuid()
  folder_id          = local.folder_id
  description        = "Function for import movies from TMDB"
  runtime            = "nodejs16-preview"
  entrypoint         = "import.handler"
  memory             = 128
  execution_timeout  = 300
  content {
    zip_filename = "../dist/import.zip"
  }
  service_account_id = yandex_iam_service_account.movies_api_sa.id
  environment        = {
    AWS_ACCESS_KEY_ID     = "FAKE_AWS_ACCESS_KEY_ID"
    AWS_SECRET_ACCESS_KEY = "FAKE_AWS_SECRET_ACCESS_KEY"
    IMAGES_BUCKET_NAME    = yandex_storage_bucket.movies_images_bucket.bucket
    DOCUMENT_API_ENDPOINT = yandex_ydb_database_serverless.movies_database.document_api_endpoint
  }
}

resource "yandex_function_trigger" "import_trigger" {
  name = local.import_trigger_name
  timer {
    cron_expression = "0 * * * ? *"
  }
  function {
    id                 = yandex_function.import_function.id
    service_account_id = yandex_iam_service_account.movies_api_sa.id
  }
}

output import_function_id {
  value = yandex_function.import_function.id
}
