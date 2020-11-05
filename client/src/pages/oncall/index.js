import React, {Component} from 'react';
import {Route, Switch, withRouter} from 'react-router-dom';
import NavBar from '../../components/navbar';
import Ajax from "../../ajax";
import Metering from './metering';
import Impact from './impact';
import LambdaEdge from './lambdaEdge';
import CustomerInformation from './customer-information';

class OnCall extends Component {
    constructor(props) {
        super(props);
        this.state = {
            regions: {}
        };
    }

    componentDidMount() {
        this.getRegions();
    }

    async getRegions() {
        const {data: regions} = await Ajax().fetch('/regions');
        this.setState({regions});
    }

    render() {
        return (
            <div>
                <NavBar/>
                <Switch>
                    <Switch>
                        <Route path={this.props.match.path + '/metering'}
                               render={(props) => <Metering {...props} regions={this.state.regions}/>}/>
                        <Route path={this.props.match.path + '/lambdaedge'}
                               render={(props) => <LambdaEdge {...props} regions={this.state.regions}/>}/>
                        <Route path={this.props.match.path + '/impact'}
                               render={(props) => <Impact {...props} regions={this.state.regions}/>}/>
                        <Route path={this.props.match.path + "/customer-information"} render={(props) => <CustomerInformation {...props} regions={this.state.regions}/>}/>
                    </Switch>
                </Switch>
            </div>
        );
    }
}

export default withRouter(OnCall);
