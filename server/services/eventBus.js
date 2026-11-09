// In-process event bus. Services/routes publish changes; the live dashboard stream subscribes.
const { EventEmitter } = require('events');

function createEventBus() {
  const bus = new EventEmitter();
  bus.setMaxListeners(200); // one listener per open admin dashboard
  return {
    publish: (event) => bus.emit('change', { ...event, at: new Date().toISOString() }),
    subscribe(fn) { bus.on('change', fn); return () => bus.off('change', fn); },
    listenerCount: () => bus.listenerCount('change'),
  };
}

module.exports = { createEventBus };
