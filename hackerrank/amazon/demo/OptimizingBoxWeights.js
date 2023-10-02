'use strict';

const fs = require('fs');

process.stdin.resume();
process.stdin.setEncoding('utf-8');

let inputString = '';
let currentLine = 0;

process.stdin.on('data', function(inputStdin) {
    inputString += inputStdin;
});

process.stdin.on('end', function() {
    inputString = inputString.split('\n');

    main();
});

function readLine() {
    return inputString[currentLine++];
}


/*
 * Complete the 'minimalHeaviestSetA' function below.
 *
 * The function is expected to return an INTEGER_ARRAY.
 * The function accepts INTEGER_ARRAY arr as parameter.
 */

function minimalHeaviestSetA(arr) {
    // Write your code here
    arr.sort((a, b) => a - b);
    const sum = arr.reduce((acc, elm) => acc + elm, 0);


    let sumA = 0;
    const A = [];

    for (let i = 0; i < arr.length; i++) {
        const elm = arr[arr.length - 1 - i]

        A.unshift(elm);
        sumA += elm;

        if (sumA > sum - sumA) {
            return A;
        }
    }

    return A;

}
function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const arrCount = parseInt(readLine().trim(), 10);

    let arr = [];

    for (let i = 0; i < arrCount; i++) {
        const arrItem = parseInt(readLine().trim(), 10);
        arr.push(arrItem);
    }

    const result = minimalHeaviestSetA(arr);

    ws.write(result.join('\n') + '\n');

    ws.end();
}
