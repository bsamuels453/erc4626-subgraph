LOCAL_NODE="http://localhost:8020"
LOCAL_IPFS="http://localhost:5001"
SUBGRAPH_SLUG="bsamuels453/erc4626"
-include .env

.PHONY: build

install:
	yarn install
	cp .env.example .env

clean :
	rm -rf ./build
	rm -rf ./generated

lint-check :; yarn prettier --check ./src ./abis

lint-fix :
	yarn sort-package-json
	yarn prettier --write ./src ./abis


build :
	$(MAKE) clean
	graph codegen
	graph build

create-local :
	graph create --node $(LOCAL_NODE) $(SUBGRAPH_SLUG)

deploy-local :
	$(MAKE) clean
	graph codegen
	graph deploy --node $(LOCAL_NODE) --ipfs $(LOCAL_IPFS) --version-label debug $(SUBGRAPH_SLUG)

deploy-hosted :
	$(MAKE) clean
	graph codegen
	graph deploy --product hosted-service $(SUBGRAPH_SLUG)
