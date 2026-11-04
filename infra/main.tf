
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

# Auth: export CLOUDFLARE_API_TOKEN (permissions: Account > Cloudflare Pages, Workers Scripts, Workers R2 Storage > Edit)
provider "cloudflare" {}

resource "cloudflare_pages_project" "site" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = "main"

  build_config = {
    build_command   = "npm ci && npm run build"
    destination_dir = "dist"
  }

  # R2 binding for Pages Functions (functions/api), which serve the cached source data.
  deployment_configs = {
    production = {
      compatibility_date = local.compatibility_date
      r2_buckets = {
        BUCKET = {
          name         = cloudflare_r2_bucket.data.name
          jurisdiction = cloudflare_r2_bucket.data.jurisdiction
        }
      }
    }
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

locals {
  compatibility_date = "2026-11-01"
  cron_bundle        = "${path.module}/../dist-worker/cron.js"
}

# Raw copies of the source data, written by the cron worker.
resource "cloudflare_r2_bucket" "data" {
  account_id   = var.account_id
  name         = "${var.project_name}-data"
  jurisdiction = "eu"
}

# Daily download of all sources into R2 (worker/cron.ts, bundled by `npm run build:worker`).
resource "cloudflare_workers_script" "cron" {
  account_id         = var.account_id
  script_name        = "${var.project_name}-cron"
  main_module        = "cron.js"
  content_file       = local.cron_bundle
  content_sha256     = filesha256(local.cron_bundle)
  compatibility_date = local.compatibility_date

  bindings = [{
    type         = "r2_bucket"
    name         = "BUCKET"
    bucket_name  = cloudflare_r2_bucket.data.name
    jurisdiction = cloudflare_r2_bucket.data.jurisdiction
  }]
}

resource "cloudflare_workers_cron_trigger" "cron" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.cron.script_name
  schedules   = [{ cron = "0 5 * * *" }] # daily, 05:00 UTC
}
