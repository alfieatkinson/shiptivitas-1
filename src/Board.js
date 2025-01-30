import React from 'react';
import Dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';

export default class Board extends React.Component {
  constructor(props) {
    super(props);
    const clients = this.getClients();
    this.state = {
      clients: {
        backlog: clients.filter(client => !client.status || client.status === 'backlog'),
        inProgress: clients.filter(client => client.status && client.status === 'in-progress'),
        complete: clients.filter(client => client.status && client.status === 'complete'),
      }
    }
    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    }
  }

  getClients() {
    fetch('/api/v1/clients') // Fetching from the backend
      .then(res => res.json())
      .then(clients => {
        this.setState({
          clients: {
            backlog: clients.filter(client => !client.status || client.status === 'backlog'),
            inProgress: clients.filter(client => client.status && client.status === 'in-progress'),
            complete: clients.filter(client => client.status && client.status === 'complete'),
          }
        });
      })
      .catch(err => console.error(err));
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
  /**
   * Change the status of client when a Card is moved
   */
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
    const clientThatMoved = clientsList.find(client => client.id === el.dataset.id);
    const clientThatMovedClone = {
      ...clientThatMoved,
      status: targetSwimlane,
    };
    // Remove ClientThatMoved from the clientsList
    const updatedClients = clientsList.filter(client => client.id !== clientThatMovedClone.id);
    // Place ClientThatMoved just before the sibling client, keeping the order
    const index = updatedClients.findIndex(client => sibling && client.id === sibling.dataset.id);
    updatedClients.splice(index === -1 ? updatedClients.length : index , 0, clientThatMovedClone);
    // Update React state to reflect changes
    this.setState({
      clients: {
        backlog: updatedClients.filter(client => !client.status || client.status === 'backlog'),
        inProgress: updatedClients.filter(client => client.status && client.status === 'in-progress'),
        complete: updatedClients.filter(client => client.status && client.status === 'complete'),
      }
    });
  }
}
