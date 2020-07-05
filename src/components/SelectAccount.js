import React, {useState, useEffect} from 'react';

import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import { Select } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';

function renderAccountOptions(accounts){
    return accounts.map( (x)=>(<option key={"option-"+x} value={x}>{x}</option>))
}

const useStyles = makeStyles((theme) => ({
    formControl: {
      margin: theme.spacing(1),
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  }));

const SelectAccount = (props) => {
    const classes = useStyles();
    return(
        props.accounts && props.accounts.length > 0 ? 
            <FormControl className={classes.formControl}>
            <InputLabel htmlFor="age-native-simple">Account</InputLabel>        
            <Select value={props.account} onChange={(e)=>props.onChange(e.target.value)}>
                {renderAccountOptions(props.accounts)}
            </Select> 
            </FormControl> 
        : null
    )
}

export default SelectAccount;