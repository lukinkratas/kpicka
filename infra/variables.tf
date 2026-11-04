variable "account_id" {
  type        = string
  description = "Cloudflare account ID"
  default     = "7e049e12ba897727225f048b677a909e"
}

variable "project_name" {
  type        = string
  description = "Pages project name, becomes <name>.pages.dev"
  default     = "kpicka"
}
