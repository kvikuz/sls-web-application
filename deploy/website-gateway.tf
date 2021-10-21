locals {
  website_gateway_name = "movies-website-gateway"
}

resource "yandex_api_gateway" "movies_website_gateway" {
  name      = local.website_gateway_name
  folder_id = local.folder_id
  spec      = file("../openapi/website.yaml")
}

output "movies_website_gateway_domain" {
  value = "https://${yandex_api_gateway.movies_website_gateway.domain}"
}
