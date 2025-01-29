import React from 'react';
import Dragula from 'dragula';
import Card from './Card';
import './Swimlane.css';

export default class Swimlane extends React.Component {
  componentDidMount() {
    const drake = Dragula([this.props.dragulaRef.current]);
    drake.on('drop', (el, target, source, sibling) => {
      this.props.onDrop(el, target, source, sibling);
    });
  }

  onDrop(el, target, source, sibling) {
    const cardId = el.getAttribute('data-id');
    const newStatus = target.parentElement.getAttribute('data-status');
    this.props.onDrop(cardId, newStatus);
  }

  render() {
    const cards = this.props.clients.map(client => {
      return (
        <Card
          key={client.id}
          id={client.id}
          name={client.name}
          description={client.description}
          status={client.status}
          onDrop={this.onDrop.bind(this)}
        />
      );
    })
    return (
      <div className="Swimlane-column">
        <div className="Swimlane-title">{this.props.name}</div>
        <div className="Swimlane-dragColumn" ref={this.props.dragulaRef}>
          {cards}
        </div>
      </div>);
  }

}
