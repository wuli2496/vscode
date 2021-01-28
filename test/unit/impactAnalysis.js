/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

const cp = require('child_process');
const tsMorph = require('ts-morph');

exports.getCommitDetails = function (commit) {
	let changes = [];

	const changesRaw = cp.execSync(`git diff-tree --no-commit-id --name-status -r ${commit}`, { encoding: 'utf8' });
	for (const change of changesRaw.split('\n')) {
		const changeDetails = change.split('\t');

		// Invalid output
		if (changeDetails.length !== 2) {
			continue;
		}

		// Deleted file
		if (changeDetails[0] === 'D') {
			continue;
		}

		changes.push(changeDetails[1]);
	}
	return changes;
};

exports.getReachableTestSuites = function (commnitChanges) {
	const testFiles = new Set();
	const dependencyMap = createDependencyMap();

	for (const file of commnitChanges) {
		// Added/Modified test file
		if (file.endsWith('.test.ts')) {
			testFiles.add(file);
			continue;
		}
		// Add reachable test suites
		getReachableTestSuitesFromFile(dependencyMap, file).forEach(f => testFiles.add(f));
	}

	return [...testFiles];
}

function createDependencyMap() {
	const dependencyMap = new Map();
	const project = new tsMorph.Project({
		tsConfigFilePath: 'src/tsconfig.json',
	});
	for (let file of project.getSourceFiles()) {
		const references = [];
		const filePath = file.getFilePath();
		const filePathKey = filePath.substr(filePath.indexOf('src/'));

		for (let node of file.getReferencingNodesInOtherSourceFiles()) {
			// @ts-expect-error
			if (node.getKind() === tsMorph.SyntaxKind.ImportDeclaration && !node.isTypeOnly()) {
				const referenceFilePath = node.getSourceFile().getFilePath();
				references.push(referenceFilePath.substr(referenceFilePath.indexOf('src/')));
			}
		}

		dependencyMap.set(filePathKey, references);
	}

	return dependencyMap;
}

function getReachableTestSuitesFromFile(dependencyMap, file) {
	const array = [];
	const visited = new Set([...file]);

	const getIndentation = (indentation) => {
		let indentationStr = '';
		for (let i = 0; i < indentation; i++) {
			indentationStr = indentationStr + '    ';
		}
		return indentationStr;
	}

	array.push({ indentation: 0, file });
	while (array.length !== 0) {
		//let item = array.shift(); // BFS
		let item = array.pop(); // DFS
		if (item.file.endsWith('.test.ts')) {
			console.log(getIndentation(item.indentation) + ' * ' + item.file);
		} else {
			console.log(getIndentation(item.indentation) + ' - ' + item.file);
		}
		const dependencies = dependencyMap.get(item.file);
		dependencies
			.filter(d => !visited.has(d))
			.forEach(d => {
				visited.add(d);
				array.push({ indentation: item.indentation + 1, file: d });
			});
	}

	return [...visited].filter(f => f.endsWith('.test.ts'));
}