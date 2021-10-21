locals {
  api_gateway_name = "movies-api-gateway"
}

resource "yandex_api_gateway" "movies_api_gateway" {
  name      = local.api_gateway_name
  folder_id = local.folder_id
  spec      = file("../openapi/api.yaml")
}

output "movies_api_gateway_domain" {
  value = "https://${yandex_api_gateway.movies_api_gateway.domain}"
}
