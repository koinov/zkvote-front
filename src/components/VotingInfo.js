import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import { Typography } from '@material-ui/core';
import CircularProgressWithLabel from "./CircularProgress"
import LinearProgressWithLabel from "./LinearProgress"
import Grid from '@material-ui/core/Grid';
import Checkbox from '@material-ui/core/Checkbox';

const useStyles = makeStyles({
  table: {
    minWidth: 600,
  },
  card : {
      marginTop : 40,
      marginBottom : 40
  },
  root: {
    flexGrow: 1,
    marginTop: 30,
    marginBottom : 30
  },
});

function OptionsTable(props){
    const classes = useStyles();
    const {results} = props;
    if( !results) return null
    const totalVoted = Object.keys(results).reduce((a,b)=>(a + results[b]),0)


    return(
    <TableContainer component={Paper}>
        <Table className={classes.table} size="small" aria-label="a dense table">
        <TableHead>
            <TableRow>
                <TableCell align="left"></TableCell>
                <TableCell align="left">Option</TableCell>
                <TableCell>Voted</TableCell>
                <TableCell>Percent</TableCell>
            </TableRow>
        </TableHead>
        <TableBody>
            {
                Object.keys(results).map((x)=>(
                    <TableRow key={"ballot-"+x}>
                        <TableCell scope="row"><Checkbox onChange={()=>props.onOption(x)} checked={x == props.option} /></TableCell>
                        <TableCell scope="row">Option #{x}</TableCell>
                        <TableCell scope="row">{results[x]}</TableCell>
                        <TableCell scope="row" style={{ width: "70%" }}><LinearProgressWithLabel value={totalVoted == 0 ? 0 : (results[x] / totalVoted) * 100} /></TableCell>
                    </TableRow>
                ))
            }
        </TableBody>
        </Table>
    </TableContainer>
    )

}


function VotingInfo(props){
    const classes = useStyles();
    console.log("VotingInfo", props)
    const {votingInfo} = props; 

    if( !votingInfo )
    {
        return null
    }
    const totalVoted = Object.keys(votingInfo.results).reduce((a,b)=>(a + votingInfo.results[b]),0)
    console.log("VotingInfo totalVoted", totalVoted)


    return(
        <Card className={classes.card}>
        <Typography variant="h4" component="h2">
            ID :# {votingInfo.votingId}
        </Typography>
        <Typography variant="h5" component="h2">
            Total votes : {votingInfo.totalVotes}
        </Typography>
        <Grid container spacing={3}>
            <Grid item xs={6}>
                <Typography variant="h5" component="h2">
                    Voted : {totalVoted}
                </Typography>
            </Grid>
            <Grid item xs={6}>
                <CircularProgressWithLabel value={(totalVoted / votingInfo.totalVotes)*100} />
            </Grid>
        </Grid>
            <OptionsTable results={votingInfo.results} onOption={props.onOption} option={props.option}/>
        </Card>
    )

}
export default VotingInfo;