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

const useStyles = makeStyles({
  table: {
    minWidth: 600,
  },
});


function chunkString (str, len) {
    const size = Math.ceil(str.length/len)
    const r = Array(size)
    let offset = 0
    
    for (let i = 0; i < size; i++) {
      r[i] = <span key={"str-"+i.toString()+str}>{str.substr(offset, len)}<br/></span>
    offset += len
    }
    
    return r
  }


export default function BallotsTable(props) {
    const classes = useStyles();
    return(
    <TableContainer component={Paper}>
        <Table className={classes.table} size="small" aria-label="a dense table">
        <TableHead>
            <TableRow>
                <TableCell align="left">Action</TableCell>
                <TableCell>Ballot</TableCell>
            </TableRow>
        </TableHead>
        <TableBody>
            {
                Object.keys(props.ballots).map((x)=>(
                    <TableRow key={"ballot-"+x}>
                        <TableCell scope="row">{props.ballots[x] == true ? <Button color="primary" variant="contained" onClick={()=>{props.onInfo(x)}}>Info</Button> : <Button color="secondary" variant="contained" onClick={()=>{props.onVote(x)}}>Vote</Button>}</TableCell>
                        <TableCell scope="row" style={{ width: "70%" }}>{chunkString(x, 90)}</TableCell>
                    </TableRow>
                ))

            }
        </TableBody>
        </Table>
    </TableContainer>
    )

}