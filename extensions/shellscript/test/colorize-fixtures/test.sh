#!/usr/bin/env bash

if [[ "$OSTYPE" == "darwin"* ]]; then
	realpath() { [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"; }
	ROOT=$(dirname $(dirname $(realpath "$0")))
else
	ROOT=$(dirname $(dirname $(readlink -f $0)))
fi

DEVELOPER=$(xcode-select -print-path)
LIPO=$(xcrun -sdk iphoneos -find lipo)

function code() {
	cd $ROOT

	# Node modules
	test -d node_modules || ./scripts/npm.sh install

	# Configuration
	export NODE_ENV=development

	# Launch Code
	if [[ "$OSTYPE" == "darwin"* ]]; then
		NAME=`node -p "require('./product.json').nameLong"`
		APPNAME=`node -p "require('./product.json').darwinExecutable"`
		exec ./.build/electron/$NAME.app/Contents/MacOS/$APPNAME . "$@"
	else
		exec ./.build/electron/electron . "$@"
	fi
}

code "$@"
