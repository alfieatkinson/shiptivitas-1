import React from 'react';
import Dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';

export default class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      clients: {
        backlog: [],
        inProgress: [],
        complete: [],
      }
    };
    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    };
  }

  renderSwimlane(name, clients, ref) {
    return (
      <Swimlane name={name} clients={clients} dragulaRef={ref} />
    );
  }

  render() {
    return (
      <div className="Board">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              {this.renderSwimlane('Backlog', this.state.clients.backlog, this.swimlanes.backlog)}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane('In Progress', this.state.clients.inProgress, this.swimlanes.inProgress)}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane('Complete', this.state.clients.complete, this.swimlanes.complete)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  componentDidMount() {
    this.getClients();

    this.drake = Dragula([
      this.swimlanes.backlog.current,
      this.swimlanes.inProgress.current,
      this.swimlanes.complete.current,
    ]);
    this.drake.on('drop', (el, target, source, sibling) => this.updateClient(el, target, source, sibling));
  }

  componentWillUnmount() {
    this.drake.remove();
  }

  getClients() {
    fetch('http://localhost:3001/api/v1/clients') // Fetching from the backend
      .then(res => res.json())
      .then(clients => {
        // Sort clients by priority before setting state
        clients.sort((a, b) => a.priority - b.priority);

        this.setState({
          clients: {
            backlog: clients.filter(client => !client.status || client.status === 'backlog'),
            inProgress: clients.filter(client => client.status && client.status === 'in-progress'),
            complete: clients.filter(client => client.status && client.status === 'complete'),
          }
        });
      })
      .catch(err => console.error('Failed to fetch clients: ', err));
  }

  // Change the status of client when a Card is moved
  updateClient(el, target, _, sibling) {
    // Reverting DOM changes from Dragula
    this.drake.cancel(true);
  
    // Define a mapping between swimlane keys and status values
    const swimlaneToStatus = {
      backlog: 'backlog',
      inProgress: 'in-progress',
      complete: 'complete',
    };
  
    const statusToSwimlane = {
      backlog: 'backlog',
      'in-progress': 'inProgress',
      complete: 'complete',
    };
  
    // Find out which swimlane the Card was moved to (status in backend)
    let targetSwimlaneStatus = null;
    if (target === this.swimlanes.backlog.current) {
      targetSwimlaneStatus = swimlaneToStatus.backlog;
    } else if (target === this.swimlanes.inProgress.current) {
      targetSwimlaneStatus = swimlaneToStatus.inProgress;
    } else if (target === this.swimlanes.complete.current) {
      targetSwimlaneStatus = swimlaneToStatus.complete;
    }
  
    // Find out which swimlane the Card was moved from (status in backend)
    let sourceSwimlaneStatus = null;
    if (this.swimlanes.backlog.current.contains(el)) {
      sourceSwimlaneStatus = swimlaneToStatus.backlog;
    } else if (this.swimlanes.inProgress.current.contains(el)) {
      sourceSwimlaneStatus = swimlaneToStatus.inProgress;
    } else if (this.swimlanes.complete.current.contains(el)) {
      sourceSwimlaneStatus = swimlaneToStatus.complete;
    }
  
    console.log(`Moved from ${sourceSwimlaneStatus} to ${targetSwimlaneStatus}`);
  
    // Create a copy of the clients in both swimlanes
    const sourceClients = [...this.state.clients[statusToSwimlane[sourceSwimlaneStatus]]];
    const targetClients = [...this.state.clients[statusToSwimlane[targetSwimlaneStatus]]];
  
    const clientThatMoved = sourceClients.find(client => client.id === Number(el.dataset.id));
  
    const clientThatMovedClone = {
      ...clientThatMoved,
      status: targetSwimlaneStatus, // Set the status correctly
    };
  
    // Remove ClientThatMoved from the source swimlane
    const updatedSourceClients = sourceClients.filter(client => client.id !== clientThatMovedClone.id);
  
    // Add ClientThatMoved to the target swimlane
    targetClients.push(clientThatMovedClone);
  
    // Sort clients by priority (ascending)
    updatedSourceClients.sort((a, b) => a.priority - b.priority);
    targetClients.sort((a, b) => a.priority - b.priority);
  
    // Update React state to reflect changes in both swimlanes
    this.setState(prevState => ({
      clients: {
        ...prevState.clients,
        [statusToSwimlane[sourceSwimlaneStatus]]: updatedSourceClients,
        [statusToSwimlane[targetSwimlaneStatus]]: targetClients,
      }
    }));
  
    // Send update to the backend
    fetch(`http://localhost:3001/api/v1/clients/${clientThatMovedClone.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: targetSwimlaneStatus, // Use the correct status for the backend
        priority: clientThatMovedClone.priority,
      }),
    }).catch(err => console.error('Failed to update client: ', err));
  }
}