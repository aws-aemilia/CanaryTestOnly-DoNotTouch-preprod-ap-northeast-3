import React, { Component } from 'react';
import styles from './table.module.css';

class Table extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: props.data
        }
    }

    render() {
        const { data } = this.props;
        return (
            <table className={styles.table}>
                <tbody>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                    </tr>
                    {
                        Object.keys(this.props.data).length ? Object.keys(this.props.data).sort().map((key, index) => {
                            // let getDate = "";
                            // if(key === "createTime" || key === "updateTime"){
                            //     getDate = `${JSON.stringify(data[key])}`;
                            // }
                            // let dateRetrieved = new Date(`${getDate}`)
                            // : key === "createTime" ? `${dateRetrieved}` : key === "updateTime" ? `${dateRetrieved}`
                            return (
                                <tr key={index}>
                                    <td>{key}</td>
                                    <td>
                                        {JSON.stringify(data[key]) === "0" ? "False" : JSON.stringify(data[key]) === "1" ? "True" : JSON.stringify(data[key])}
                                    </td>
                                </tr>
                            )
                        }) : <tr>
                                <td>No Data Found</td>
                                <td></td>
                            </tr>
                    }
                </tbody>
            </table>
        )
    }
}

export default Table;
