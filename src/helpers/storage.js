
async function readBallots(){
    const ballotsString = localStorage.getItem("ballots");
    if( !ballotsString || ballotsString.length == 0) {
        return {}
    }
    return JSON.parse(ballotsString);
}

async function addBallot(ballotString){
    let ballots = await readBallots();
    ballots[ballotString] = false;
    console.log("addBalots", ballots)
    localStorage.setItem("ballots", JSON.stringify(ballots));
}

async function setVoted(ballotString){
    let ballots = await readBallots();
    ballots[ballotString] = true;
    console.log("setVotes", ballots)

    localStorage.setItem("ballots", JSON.stringify(ballots));
}

module.exports = {
    readBallots,
    addBallot,
    setVoted,
}