const readline = require('readline');

async function confirm(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(message, (answer) => {
            const lower = answer.toLowerCase();
            if (lower === 'y' || lower === 'yes') {
                rl.close();
                resolve(true);
                return;
            }

            rl.close();
            resolve(false);
        });
    });
}

module.exports = { confirm }