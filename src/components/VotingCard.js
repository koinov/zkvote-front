import React, {useState, useEffect} from 'react';

import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import Button from '@material-ui/core/Button';
import CircularProgressWithLabel from "./CircularProgress"
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';


import {getAccounts, getVotingInfo, init, getVotes, getBallot, getVotingsCounter} from '../helpers/tornado'


const VotingCard = (props) => {
    const [values, setValues] = useState({});
    const totalVoted = values.votingInfo ? Object.keys(values.votingInfo.results).reduce((a,b)=>(a + values.votingInfo.results[b]),0) : 0;

    useEffect(()=>{
        if( values.inited != true){ 
            getVotingInfo(props.votingId).then((vi)=>{
                console.log("VotingCard effect", props.votingId, vi);
                setValues({...values, inited: true, votingInfo : vi, account : props.account})
            });
        };
        if( values.account != props.account){
            console.log("Account changed", props.account);
            getVotes(props.votingId, props.account).then((votes)=>{
                setValues({...values, votes,  account : props.account})
            })
        }
    });

    return(
        <Card>
            <CardContent>
                <Typography gutterBottom variant="h5" component="h2">
                    Voting #{props.votingId}
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={3}>
                        <Typography gutterBottom variant="h6" component="h3">
                                Progress {totalVoted} { values.votingInfo ? "/ " + values.votingInfo.totalVotes : null }
                        </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        { values.votingInfo && values.votingInfo.totalVotes > 0 ? <CircularProgressWithLabel value={totalVoted / values.votingInfo.totalVotes * 100} /> : null}
                    </Grid>
                    <Grid item xs={3}>
                            {values.votes ? values.votes > 0 ? <p>You have {values.votes} votes</p> : <p>You do not have votes</p> : null }
                    </Grid>
                    <Grid item xs={3}>
                    <Button color="primary" href={"/voting/"+props.votingId.toString()}>View</Button>
                    </Grid>

                </Grid>
            </CardContent>
        </Card>
    )
}

export default VotingCard