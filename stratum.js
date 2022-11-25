const EventEmitter = require('events');
const net = require('net');
const _ = require('lodash');

const MinerSocket = require('./MinerSocket');

class StratumProxy extends EventEmitter {
	constructor(config) {
		super();

		this.config = config;
		this.workers = {};
		this.app = net.createServer(socket => {
			const connection = new MinerSocket(socket, config);

			const events = [
				'log',
				'minerConnect',
				'minerDisconnect',
				'minerError',
				'poolDisconnect',
				'poolError',
				'data',
				'submit',
				'authenticated',
				'authorize',
				'shareAccepted',
				'shareRejected',
				'notify'
			];

			const updateEvents = ['authenticated', 'submit', 'shareAccepted', 'shareRejected', 'notify'];

			updateEvents.map(each => {
				connection.on(each, result => {
					this.workers[result.id] = _.omit(result, ['response']);
					this.emitMessage('updateWorker', this.workers[result.id]);
				});
			});

			connection.on('minerDisconnect', result => {
				this.emitMessage('deleteWorker', this.workers[result.id]);
				delete this.workers[result.id];
			});

			events.map(each => connection.on(each, e => this.emitMessage(each, e)));
		});
	}

	getWorkers(address) {
		return Object.keys(this.workers)
			.map(e => this.workers[e])
			.filter(e => e.address === address);
	}

	emitMessage(event, response) {
		this.emit(event, response);
	}

	listen(port, callback = () => {}) {
		const { poolAddress, poolPort, address, minerName } = this.config;

		console.log(`[Stratum Proxy] listening at port ${port}`);
		console.log(
			`[Stratum Proxy] requests proxied to ${poolAddress}:${poolPort} as ${address}.${minerName}`
		);

		return this.app.listen(port, callback);
	}
}

module.exports = StratumProxy;
