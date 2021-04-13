import { flatten } from 'lodash';
import { Dictionary } from 'ts-essentials';

import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
    getExtractorName,
    PersistedLog,
    SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from '../../utils';
import { parseBytes32String } from 'ethers/utils';
import { Ilk } from '../services/getIlkInfo';
import BigNumber from 'bignumber.js';

const dogAbi = require('../../../abis/dog.json');
async function handleBark(
    params: Dictionary<any>,
    log: PersistedLog,
    services: LocalServices,
): Promise<void> {
    const values = {
        auction_id: params.id.toString(),
        ilk: parseBytes32String(params.ilk),
        urn: params.urn.toLowerCase(),
        ink: params.ink.toString(),
        art: params.art.toString(),
        due: params.due.toString(),
        clip: params.flip.toLowerCase(),

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    };

    await services.tx.none(
        `INSERT INTO auctions.bark(
          
          log_index, tx_id, block_id
        ) VALUES (
          
          \${log_index}, \${tx_id}, \${block_id}
        );`,
        values,
    );
}

async function handleLiq2AuctionStarted(
    params: Dictionary<any>,
    log: PersistedLog,
    services: LocalServices,
    dependencies: auctionsTransformerDependencies,
): Promise<void> {
    const timestamp = await services.tx.oneOrNone(
        `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
        {
            block_id: log.block_id,
        },
    );

    const ilkData = await dependencies.getIlkInfo(params.ilk, services);

    debugger

    const event = {
        kind: 'AUCTION_STARTED',
        collateral: ilkData.symbol,
        collateral_amount: new BigNumber(params.ink)
            .div(new BigNumber(10).pow(18))
            .toString(),
        dai_amount: new BigNumber(params.art).div(new BigNumber(10).pow(18)).toString(),
        auction_id: params.id.toString(),
        urn: params.urn.toLowerCase(),
        timestamp: timestamp.timestamp,

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    };

    await services.tx.none(
        `INSERT INTO vault.events(
            kind, collateral, collateral_amount, dai_amount, timestamp, auction_id, urn,
            log_index, tx_id, block_id
          ) VALUES (
            \${kind}, \${collateral}, \${collateral_amount}, \${dai_amount}, \${timestamp}, \${auction_id}, \${urn},
            \${log_index}, \${tx_id}, \${block_id}
          );`,
        event,
    );
}

const dogHandlers = {
    async Bite(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
        await handleBark(event.params, log, services);
    }
}

export const getDogTransformerName = (address: string) => `dogTransformer-${address}`;
export const dogTransformer: (
    addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
    return addresses.map(_deps => {
        const deps = normalizeAddressDefinition(_deps);

        return {
            name: getDogTransformerName(deps.address),
            dependencies: [getExtractorName(deps.address)],
            startingBlock: deps.startingBlock,
            transform: async (services, logs) => {
                await handleEvents(services, dogAbi, flatten(logs), dogHandlers);
            },
        };
    });
};

interface auctionsTransformerDependencies {
    getIlkInfo: (ilk: string, services: LocalServices) => Promise<Ilk>;
}

const handlersLiq2 = (dependencies: auctionsTransformerDependencies) => ({
    async Bite(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
        await handleLiq2AuctionStarted(event.params, log, services, dependencies);
    },
});

export const getAuctionTransformerName = (address: string) => `auctionTransformer-lig2.0-${address}`;

export const auctionLiq2Transformer: (
    addresses: (string | SimpleProcessorDefinition)[],
    dependencies: auctionsTransformerDependencies,
) => BlockTransformer[] = (addresses, dependencies) => {
    return addresses.map(_deps => {
        const deps = normalizeAddressDefinition(_deps);

        return {
            name: getAuctionTransformerName(deps.address),
            dependencies: [getExtractorName(deps.address)],
            startingBlock: deps.startingBlock,
            transform: async (services, logs) => {
                await handleEvents(services, dogAbi, flatten(logs), handlersLiq2(dependencies));
            },
        };
    });
};
