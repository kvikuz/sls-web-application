locals {
  vote_function_name = "vote-function"
}

resource yandex_function vote_function {
  name               = local.vote_function_name
  user_hash          = uuid()
  folder_id          = local.folder_id
  description        = "Function for put vote from stream"
  runtime            = "nodejs16-preview"
  entrypoint         = "vote.handler"
  memory             = 128
  execution_timeout  = 300
  content {
    zip_filename = "../dist/vote.zip"
  }
  service_account_id = yandex_iam_service_account.movies_api_sa.id
  environment        = {
    AWS_ACCESS_KEY_ID     = "FAKE_AWS_ACCESS_KEY_ID"
    AWS_SECRET_ACCESS_KEY = "FAKE_AWS_SECRET_ACCESS_KEY"
    DOCUMENT_API_ENDPOINT = yandex_ydb_database_serverless.movies_database.document_api_endpoint
  }
}

output vote_function_id {
  value = yandex_function.vote_function.id
}
