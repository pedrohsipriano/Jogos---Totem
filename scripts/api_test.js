const http = require('http');

async function fetchJson(path) {
    const url = `http://localhost:4000${path}`;
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', err => reject(err));
    });
}

(async () => {
    try {
        console.log('Fetching /api/admin/records...');
        const records = await fetchJson('/api/admin/records');
        console.log('games count:', records.games?.length || 0);
        console.log('first game sample:', records.games && records.games[0] ? { id: records.games[0].id, code: records.games[0].code, name: records.games[0].name } : null);

        console.log('\nFetching /api/gameContent/wordsearch...');
        const content = await fetchJson('/api/gameContent/wordsearch');
        console.log('game:', content.game);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message || err);
        process.exit(2);
    }
})();