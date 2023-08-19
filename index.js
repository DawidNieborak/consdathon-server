const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {origin: "*"}
});

const port = process.env.PORT || 3000;

let players = [];
let teams = [];

io.on('connection', (socket) => {
    console.log('a player connected');
    console.log("Connected: " + players.length);

    socket.on('message', (message) => {
        if (message && message.type === 'joinTeam') {
            console.log(message.team.id);
            let teamId = message.team.id;
            const {username, team} = message;

            // Check if the player is already connected
            const existingPlayer = players.find(player => player.socketId === socket.id);
            if (!existingPlayer) {
                players.push({socketId: socket.id, username, teamId: team.id});
            }

            if (!teams[teamId]) {
                teams[teamId] = {score: 0, players: []};
            }

            // Remove the player from any previous team
            for (const existingTeam in teams) {
                teams[existingTeam].players = teams[existingTeam].players.filter(player => player.socketId !== socket.id);
            }

            teams[teamId].players.push({socketId: socket.id, username});
            console.log(teams[teamId].players);

            socket.emit('startGame', {msg: "Przekierowanie do lobby", result: 1});
        }

        // jezeli admin (cockpit)
        if (message && message.type === 'gameStart') {
            const teamId = message.teamId;
            io.emit('gameStart', {msg: "Gra się rozpoczyna", result: 2, teamId: teamId});
        }

        if (message && message.type === 'click' && message.msg === 'gameStart') {
            const team = message.team;
            if (teams[team.id]) {
                teams[team.id].score += 10;
                if (teams[team.id].score >= 20) {
                    io.emit('endGame', {msg: "Koniec gry.", team: teams[team.id], teamId: team.id});
                }
                io.emit('teamScoreUpdate', {teams, teamId: team.id});
            }
        }
    });

    socket.on('disconnect', (socket) => {
        console.log('a player disconnected');
        // Remove the disconnected player from the team
        for (const team in teams) {
            teams[team].players = teams[team].players.filter(player => player.socketId !== socket.id);
        }
        io.emit('updatePlayers', teams);
    });
});

http.listen(port, () => console.log(`listening on port ${port}`));
