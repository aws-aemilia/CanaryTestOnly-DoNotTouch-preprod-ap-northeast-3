import React, {Component} from 'react';
import {Route, Switch} from 'react-router-dom';
import './App.css';
import Home from './pages/home';
import Failures from './pages/failures';
import FailureAnalysis from './pages/failureAnalysis';
import Builds from './pages/builds';
import Logs from './pages/logs';
import OnCall from './pages/oncallTools';
import Ajax from "./ajax";
import CustomerTools from './pages/customerTools'

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {username: undefined, error: undefined};
    }

    componentWillMount() {
        Ajax().fetch({
            method: 'GET',
            url: '/username'
        })
            .then((result) => this.setState({username: result.data}))
            .catch((err) => this.setState({error: err}));
    }
    render() {
        console.log("Hello")
        if (this.state.error) {
            return <div>There was an error processing your request</div>;
        }
        if (!this.state.username) {
            return null;
        }
        const App = () => (
            <div>
                <Switch>
                    <Route exact path='/' component={Home}/>
                    <Route path='/failures/account/:accountId' component={Failures}/>
                    <Route path='/failures/app/:appId' component={Failures}/>
                    <Route path='/failures/days/:days' component={Failures}/>
                    <Route path='/failures' component={Failures}/>
                    <Route path='/failureAnalysis/days/:daysFrom/:daysTo' component={FailureAnalysis}/>
                    <Route path='/failureAnalysis/search/:query' component={FailureAnalysis}/>
                    <Route path='/builds/:stage/:region/:project' component={Builds}/>
                    <Route path='/logs/:stage/:region/:logGroupName/:logStreamName' component={Logs}/>
                    <Route path='/oncallTools' component={OnCall}/>
                    <Route path='/customerTools' component={CustomerTools}/>
                </Switch>
            </div>
        );
        return (
            <Switch>
                <App/>
            </Switch>
        );
    }
}

export default App;
