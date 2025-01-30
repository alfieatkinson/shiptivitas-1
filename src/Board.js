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

    // Find out which swimlane the Card was moved to
    let targetSwimlane = 'backlog';
    if (target === this.swimlanes.inProgress.current) {
      targetSwimlane = 'in-progress';
    } else if (target === this.swimlanes.complete.current) {
      targetSwimlane = 'complete';
    }

    // Create a new clients array
    const clientsList = [
      ...this.state.clients.backlog,
      ...this.state.clients.inProgress,
      ...this.state.clients.complete,
    ];

    const clientThatMoved = clientsList.find(client => client.id === Number(el.dataset.id));

    const clientThatMovedClone = {
      ...clientThatMoved,
      status: targetSwimlane,
    };

    // Remove ClientThatMoved from the clientsList
    const updatedClients = clientsList.filter(client => client.id !== clientThatMovedClone.id);

    console.log(clientThatMovedClone);

    // Get the sibling's priority (if it exists)
    let siblingPriority = null;
    if (sibling) {
      const siblingClient = updatedClients.find(client => client.id === Number(sibling.dataset.id));
      siblingPriority = siblingClient ? siblingClient.priority : null;
    }

    // Calculate the new priority for the moved client
    if (siblingPriority !== null) {
      // If there's a sibling, the client moves to the position before the sibling
      clientThatMovedClone.priority = siblingPriority;
      updatedClients.forEach(client => {
        if (client.priority >= clientThatMovedClone.priority) {
          client.priority += 1;
        }
      });
    } else {
      // If there's no sibling, the client moves to the last position in the swimlane
      clientThatMovedClone.priority = updatedClients.length;
    }

    // Insert the moved client into the updatedClients array
    updatedClients.push(clientThatMovedClone);

    console.log(clientThatMovedClone);

    // Sort clients by priority (ascending)
    updatedClients.sort((a, b) => a.priority - b.priority);

    // Update React state to reflect changes
    this.setState({
      clients: {
        backlog: updatedClients.filter(client => !client.status || client.status === 'backlog'),
        inProgress: updatedClients.filter(client => client.status && client.status === 'in-progress'),
        complete: updatedClients.filter(client => client.status && client.status === 'complete'),
      }
    });

    // Send update to the backend
    fetch(`http://localhost:3001/api/v1/clients/${clientThatMovedClone.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: targetSwimlane,
        priority: clientThatMovedClone.priority,
      }),
    }).catch(err => console.error('Failed to update client: ', err));
  }
}
