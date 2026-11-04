
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # State in Cloudflare R2 (S3-compatible). Credentials: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from ../.env
  backend "s3" {
    bucket = "tf-state"
    key    = "kpicka/terraform.tfstate"
    region = "auto" # EU jurisdiction is set by the endpoint; R2 only accepts "auto" as region
    endpoints = {
      s3 = "https://7e049e12ba897727225f048b677a909e.eu.r2.cloudflarestorage.com"
    }

    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

# Auth: export CLOUDFLARE_API_TOKEN (permission: Account > Cloudflare Pages > Edit)
provider "cloudflare" {}

resource "cloudflare_pages_project" "site" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = "main"

  build_config = {
    build_command   = "npm ci && npm run build"
    destination_dir = "dist"
  }

  # Requires the Cloudflare Pages GitHub app to be installed on the repo.
  source = {
    type = "github"
    config = {
      owner                          = "lukinkratas"
      repo_name                      = "kpicka"
      production_branch              = "main"
      production_deployments_enabled = true
      preview_deployment_setting     = "none"
    }
  }
}
