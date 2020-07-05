import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import ProTip from './ProTip';
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Home from  "./Home"
import Voting from  "./Voting"
import {getAccounts, getVotingInfo, init} from './helpers/tornado'







export default function App() {
  console.log("APPP!")
  return (
        <Router>
          <Switch>
            <Route path="/" exact component={Home}/>
            <Route path="/voting/:id" component={Voting} />}
            />
          </Switch>
        </Router>
  );
}
