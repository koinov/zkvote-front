import React, {useState, useEffect} from 'react';

import { makeStyles } from '@material-ui/core/styles';

import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';

import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';

import SelectAccount from "./components/SelectAccount";
import BallotsTable from "./components/BallotsTable";
import VotingInfo from "./components/VotingInfo";
import Modal from '@material-ui/core/Modal';
import {getAccounts, getVotingInfo, init, getVotes, getBallot, parseNote, sendVote, getBallotInfo, addNewAccount, topupAccount} from './helpers/tornado'
import {readBallots, setVoted, addBallot}  from "./helpers/storage"
const { toWei, fromWei, toBN, BN } = require('web3-utils')

function Copyright() {
    return (
      <Typography variant="body2" color="textSecondary" align="center" style={{marginTop:50}}>
        {'Copyright © '}
        {new Date().getFullYear()}
        {'.'}
      </Typography>
    );
  }

  const useStyles = makeStyles((theme) => ({
    paper: {
      position: 'absolute',
      width: 800,
      backgroundColor: theme.palette.background.paper,
      border: '2px solid #000',
      boxShadow: theme.shadows[5],
      padding: theme.spacing(2, 4, 3),
    },
  }));
  
  function rand() {
    return Math.round(Math.random() * 20) - 10;
  }

  function getModalStyle() {
    const top = 50 + rand();
    const left = 50 + rand();
  
    return {
      top: `${top}%`,
      left: `${left}%`,
      transform: `translate(-${top}%, -${left}%)`,
    };
  }

const Voting  = (props) => {
    const [values, setValues] = useState({});
    const [ballotInfo, setBallotInfo] = useState(null);
    const classes = useStyles();
    const votingId = props.match.params.id;
    const {votingInfo} = values;
    const [modalStyle] = React.useState(getModalStyle);

    const body = ballotInfo ? (
        <div style={modalStyle} className={classes.paper}>
          <h2 id="simple-modal-title">Ballot Info</h2>
        <ul>
            <li><strong>Ballot redemption time : </strong> {ballotInfo.ballotDate} {ballotInfo.ballotTime}</li>
            <li><strong>Ballot taken by : </strong> {ballotInfo.ballotFrom}</li>
            <li><strong>Ballot transaction : </strong> {ballotInfo.ballotTxHash}</li>
            <li><strong>Ballot commitment : </strong> {ballotInfo.ballotCommitment}</li>
            {!ballotInfo.isVoted ? <li><strong>Not voted</strong></li>  :  null }
            {ballotInfo.isVoted ? <li><strong>Voted at  :</strong> Voting #{ballotInfo.votingId}</li>  :  null }
            {ballotInfo.isVoted ? <li><strong>Voting time  :</strong> {ballotInfo.votingDate} {ballotInfo.votingTime}</li>  :  null }
            {ballotInfo.isVoted ? <li><strong>Voted by  :</strong> {ballotInfo.votingFrom}</li>  :  null }
            {ballotInfo.isVoted ? <li><strong>Voting transaction :</strong> {ballotInfo.votingTxHash}</li>  :  null }
            {ballotInfo.isVoted ? <li><strong>Voting nullifier :</strong> {ballotInfo.votingNullifier}</li>  :  null }
        </ul>
        </div>
    ) : null;

    const loadAccounts = async ()=>{
        console.log("loadAccounts", values);
        init({rpc : "http://localhost:8545"}).then( ()=>{
            getAccounts().then((r)=>{
                console.log(r);
                getVotingInfo(props.match.params.id).then((vi)=>{
                    console.log(vi);
                    readBallots().then((ballots)=>{
                        setValues({...values, accounts:r, inited : true, account : r.length > 0 ? r[0] : null, votingInfo:vi, ballots, option : -1})
                    });
                });
    
            });

        })
    }

    const loadBallots = async ()=>{
        const ballots = await readBallots()
        console.log("readBallots", ballots);
        setValues({ ...values, ballots });
    }

    useEffect(()=>{
        console.log("Voting useEffect", values);
        if( values.inited != true){
          console.log("Voting useEffect loading accounts");
          
          loadAccounts();
        }
      });

    const fetchBallot = async () => {
        console.log("Fetch Ballot", votingId, values.account);

        const ballot = await getBallot({votingId, address:values.account})
        console.log(ballot);
        await addBallot(ballot);
        loadBallots();
    } 


    const loadVotes = async (votingId, accountAddress) => {
        const votesNumber = await getVotes( votingId, accountAddress)
        console.log("Available votes", votesNumber)
        return votesNumber;
    }

    const  changeAccount = async (account) => {
        console.log("Change account", account)
        const availableVotes = await loadVotes(votingId, account)
        setValues({...values, account, availableVotes});
    }

    const vote = async (ballot) => {
        if( values.option == -1 ){
            console.log("Option is not seleceted")
            return;
        }
        console.log("Vote", ballot)
        const { netId, votingId, deposit } = parseNote(ballot)
        console.log("parsedBallot", netId, votingId, deposit);

        const newAccount = await addNewAccount();
        await topupAccount(values.accounts[0], newAccount, toWei("0.1", "ether") );

        const result = await sendVote({ deposit, votingId, optionNumber: values.option, address : newAccount  });
        console.log("Vote result", result);
        setVoted(ballot);
        getVotingInfo(votingId).then((vi)=>{
            readBallots().then((ballots)=>{
                setValues({...values,  votingInfo:vi, ballots})
            });
        });
    }

    const info = async (ballot) => {
        console.log("Info", ballot);
        const ballotInfo = await getBallotInfo(ballot); 
        setBallotInfo(ballotInfo);
    }

    console.log("Voting", props);
    return (
        <Container maxWidth="md">
        <Modal
            open={ballotInfo != null}
            onClose={()=>{setBallotInfo(null)}}
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
        >
            {body}
        </Modal>
        <Box my={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            ZKVote 
          </Typography>
        {/*
        <Typography variant="h5" component="h2" >
            Voting #{votingId}
        </Typography>
        */}

        <Typography variant="h6" component="h4" >
            Select an account
        </Typography>

        <SelectAccount accounts={values.accounts} account={values.account} onChange={(account)=>{changeAccount(account)} }  />

        <VotingInfo votingInfo={votingInfo} onOption={(x)=>{setValues({...values, option : x})}} option={values.option}/>


        {values.availableVotes > 0 ?
            <Card> 
                <Typography conponent="h2"m variant="h4">
                    You have {values.availableVotes} votes available
                </Typography>
                <Button color="secondary" variant="contained" onClick={()=>{fetchBallot()}}>Get ballot</Button> 
            </Card> 
        : null }

        {values.ballots ? <BallotsTable ballots={values.ballots} onVote={(ballot)=>{vote(ballot)}} onInfo={(ballot)=>{info(ballot)}}/> : null}

            <Copyright />
          </Box>
        </Container>

    );
}  

export default Voting;