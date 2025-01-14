import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { makeRawEventBasedOnTopicExtractor } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { join } from 'path';

import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import {
    managerGiveTransformer,
    openCdpTransformer,
} from './borrow/transformers/cdpManagerTransformer';

import {
    vatCombineTransformer,
    vatMoveEventsTransformer,
    vatRawMoveTransformer,
    vatTransformer,
} from './borrow/transformers/vatTransformer';
import { auctionTransformer, catTransformer } from './borrow/transformers/catTransformer';
import {
    AbiInfo,
    makeRawEventExtractorBasedOnTopicIgnoreConflicts,
    makeRawEventBasedOnDSNoteTopic,
} from './borrow/customExtractors';
import { flipNoteTransformer, flipTransformer } from './borrow/transformers/flipperTransformer';
import { getIlkInfo } from './borrow/dependencies/getIlkInfo';
import { getUrnForCdp } from './borrow/dependencies/getUrnForCdp';
import { getLiquidationRatio } from './borrow/dependencies/getLiquidationRatio';
import { getIlkForCdp } from './borrow/dependencies/getIlkForCdp';
import {
    auctionLiq2Transformer,
    dogTransformer,
    getDogTransformerName,
} from './borrow/transformers/dogTransformer';
import { clipperTransformer } from './borrow/transformers/clipperTransformer';
import { multiplyGuniTransformer, multiplyTransformer } from './borrow/transformers/multiply';
import { exchangeTransformer } from './borrow/transformers/exchange';

import { getOraclesAddresses } from './utils/addresses';
import {
    getOracleTransformerName,
    oraclesTransformer,
} from './borrow/transformers/oraclesTransformer';
import {
    eventEnhancerGasPrice,
    eventEnhancerTransformer,
    eventEnhancerTransformerEthPrice,
} from './borrow/transformers/eventEnhancer';
import { multiplyHistoryTransformer } from './borrow/transformers/multiplyHistoryTransformer';
import { initializeCommandAliases } from './utils';
import { automationBotTransformer } from './borrow/transformers/automationBotTransformer';

const testChainAddresses = require('./addresses/testchain.json');

const GENESIS = Number(process.env.GENESIS) || 1;

const vat = {
    address: testChainAddresses.MCD_VAT,
    startingBlock: GENESIS,
};

const cdpManagers = [
    {
        address: testChainAddresses.CDP_MANAGER,
        startingBlock: GENESIS,
    },
];

const cats = [
    {
        address: testChainAddresses.MCD_CAT,
        startingBlock: GENESIS,
    },
];

const dogs = [
    {
        address: testChainAddresses.MCD_DOG,
        startingBlock: GENESIS,
    },
];

const clippers = [
    {
        name: 'clipper',
        abi: require('../abis/clipper.json'),
        startingBlock: GENESIS,
    },
];

const flipper = [
    {
        name: 'flipper',
        abi: require('../abis/flipper.json'),
        startingBlock: GENESIS,
    },
];

const oracle = [
    {
        name: 'oracle',
        abi: require('../abis/oracle.json'),
        startingBlock: GENESIS,
    },
    {
        name: 'lp-oracle',
        abi: require('../abis/lp-oracle.json'),
        startingBlock: GENESIS,
    },
];

const flipperNotes: AbiInfo[] = [
    {
        name: 'flipper',
        functionNames: [
            'tend(uint256,uint256,uint256)',
            'dent(uint256,uint256,uint256)',
            'deal(uint256)',
        ],
        abi: require('../abis/flipper.json'),
        startingBlock: GENESIS,
    },
];

// const automationBot = {
//     address: mainnetAddresses.AUTOMATION_BOT,
//     startingBlock: 14583413,
// };

const commandMapping = [
    {
        command_address: '0x0000000000000000000000000000000000000000'.toLowerCase(),
        kind: 'stop-loss',
    },
];

const addresses = {
    ...testChainAddresses,
    MIGRATION: '0x0000000000000000000000000000000000000000',
    ILK_REGISTRY: testChainAddresses.ILK_REGISTRY,
};

// const multiply = [
//     {
//         address: '0x33b4be1b67c49125c1524777515e4034e04dff58',
//         startingBlock: 13184929,
//     },
//     {
//         address: '0xeae4061009f0b804aafc76f3ae67567d0abe9c27',
//         startingBlock: 13140365,
//     },
//     {
//         address: '0x2a49Eae5CCa3f050eBEC729Cf90CC910fADAf7A2',
//         startingBlock: 13461195,
//     },
// ];

// const guni = [
//     {
//         address: '0x64b0010f6b90d0ae0bf2587ba47f2d3437487447',
//         startingBlock: 13621657,
//     },
//     {
//         address: '0xed3a954c0adfc8e3f85d92729c051ff320648e30',
//         startingBlock: 13733654,
//     },
// ];

// const exchange = [
//     {
//         address: '0xb5eb8cb6ced6b6f8e13bcd502fb489db4a726c7b',
//         startingBlock: 13140368,
//     },
//     {
//         address: '0x99e4484dac819aa74b347208752306615213d324',
//         startingBlock: 13677143,
//     },
//     {
//         address: '0x12dcc776525c35836b10026929558208d1258b91',
//         startingBlock: 13733602,
//     },
//     {
//         address: '0xf22f17b1d2354b4f4f52e4d164e4eb5e1f0a6ba6',
//         startingBlock: 15774580,
//     },
// ];
const oracles = getOraclesAddresses(testChainAddresses).map(description => ({
    ...description,
    startingBlock: GENESIS,
}));

const oraclesTransformers = oracles.map(getOracleTransformerName);

export const config: UserProvidedSpockConfig = {
    startingBlock: GENESIS,
    extractors: [
        ...makeRawLogExtractors(cdpManagers),
        ...makeRawLogExtractors(cats),
        ...makeRawLogExtractors(dogs),
        ...makeRawLogExtractors([vat]),
        // ...makeRawLogExtractors([automationBot]),
        ...makeRawEventBasedOnTopicExtractor(flipper),
        ...makeRawEventBasedOnDSNoteTopic(flipperNotes),
        ...makeRawEventExtractorBasedOnTopicIgnoreConflicts(
            clippers,
            dogs.map(dog => dog.address.toLowerCase()),
        ), // ignore dogs addresses because event name conflict
        // ...makeRawLogExtractors(multiply),
        // ...makeRawLogExtractors(guni),
        // ...makeRawLogExtractors(exchange),
        ...makeRawEventExtractorBasedOnTopicIgnoreConflicts(oracle),
    ],
    transformers: [
        ...openCdpTransformer(cdpManagers, { getUrnForCdp }),
        ...managerGiveTransformer(cdpManagers),
        ...catTransformer(cats),
        ...auctionTransformer(cats, { getIlkInfo }),
        ...dogTransformer(dogs),
        ...auctionLiq2Transformer(dogs, { getIlkInfo }),
        vatTransformer(vat),
        vatCombineTransformer(vat),
        vatMoveEventsTransformer(vat),
        vatRawMoveTransformer(vat),
        flipTransformer(),
        flipNoteTransformer(),
        // automationBotTransformer(automationBot, multiply),
        clipperTransformer(dogs.map(dep => getDogTransformerName(dep.address))),
        // ...multiplyTransformer(multiply, {
        //     cdpManager: cdpManagers[0].address,
        //     vat: vat.address,
        //     getIlkForCdp,
        //     getLiquidationRatio,
        // }),
        // ...multiplyGuniTransformer(guni, {
        //     cdpManager: cdpManagers[0].address,
        //     vat: vat.address,
        //     getIlkForCdp,
        //     getLiquidationRatio,
        // }),
        // ...exchangeTransformer(exchange),
        ...oraclesTransformer(oracles),
        eventEnhancerTransformer(vat, dogs[0], cdpManagers, oraclesTransformers),
        eventEnhancerTransformerEthPrice(vat, dogs[0], cdpManagers, oraclesTransformers),
        // multiplyHistoryTransformer(vat.address, {
        //     dogs,
        //     multiplyProxyActionsAddress: [...multiply, ...guni],
        //     exchangeAddress: [...exchange],
        // }),
        eventEnhancerGasPrice(vat, cdpManagers),
    ],
    migrations: {
        borrow: join(__dirname, './borrow/migrations'),
    },
    api: {
        whitelisting: {
            enabled: false,
            whitelistedQueriesDir: './queries',
        },
    },
    addresses,
    onStart: async services => {
        await initializeCommandAliases(services, commandMapping);
    },
};
