.PHONY: fmt fmtchk deploy

help:
	@echo "Available targets:"
	@echo "  fmt              - Format the code using Terraform"
	@echo "  fmtchk           - Check formatting using Terraform"
	@echo "  deploy           - Deploy Cloudflare infra via Terraform"

fmt:
	terraform fmt infra/

fmtchk:
	terraform fmt -check infra/

deploy:
	npm run build:etl && \
	set -a && . ./.env && set +a && \
	terraform -chdir=infra/ apply
