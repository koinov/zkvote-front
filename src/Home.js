import React, {useState, useEffect} from 'react';

import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import {getAccounts, getVotingInfo, init, getVotes, getBallot, getVotingsCounter} from './helpers/tornado'
import VotingCard from "./components/VotingCard";
import SelectAccount from "./components/SelectAccount";


function renderVotingCards(votingsCounter, account){
    let ret = []
    for(let i = 1; i < votingsCounter; i++){
        ret.push(<VotingCard key={"votingcard-"+i.toString()} votingId={i} account={account}/>)
    }
    return ret;
}

export default function Home() {
    const [values, setValues] = useState({});
    
    const loadAccounts = async ()=>{
        console.log("loadAccounts", values);
        init({rpc : "http://localhost:8545"}).then( ()=>{
            getAccounts().then((r)=>{
                console.log(r);
                getVotingsCounter().then((vc)=>{
                    console.log(vc);
                    setValues({...values, accounts:r, inited : true, account : r.length > 0 ? r[0] : null, votingsCounter:vc })
                });
            });
        })
    }

    useEffect(()=>{
        console.log("Voting useEffect", values);
        if( values.inited != true){
          console.log("Voting useEffect loading accounts");
          loadAccounts();
        }
    });
    const  changeAccount = async (account) => {
        console.log("Change account", account)
        setValues({...values, account});
    }
    return (        
    <Container maxWidth="md">
 
      <Box my={4}>
      <Typography variant="h4" component="h1" gutterBottom>
        ZKVote 
      </Typography>
      <SelectAccount accounts={values.accounts} account={values.account} onChange={(account)=>{changeAccount(account)} }  />


        {values.votingsCounter ? renderVotingCards(values.votingsCounter, values.account) : null}
        </Box>
    </Container>
    );
}  