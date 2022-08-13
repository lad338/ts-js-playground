// Type definitions

type CountryDetails = {
    name: Country;
    continent: Continent;
};

type Item = string;

class Warehouse {
    name: Country;
    items: Item[];
}

class CustomerOrder {
    destination: Country;
    items: Item[];
    shipments: Shipment[];
    note: string;
}

type Shipment = {
    fromWarehouse: Warehouse;
    items: string[];
};

type ItemMap = {
    [name: string]: number;
};

type SearchedSet = Set<string>;

type CombinationResult = {
    isFound: boolean;
    cost: number;
    combination: number[];
};

//
// Assumptions:
//
// 1.  There are sufficient items across all the warehouse.
//     For simplicity, impossible orders are not considered.
//     They should be expected to be blocked off before entering this stage.
//
// 2.  Although the rule is to "Prioritize nearest warehouse when arranging shipment",
//     minimizing delivery expenses is also another task to be done.
//     Therefore, when it comes to a conflict between multiple same continent shipments vs singular cross continent shipment,
//     I'll configure a threshold indicating which ever comes lower cost.
//     If they really have the same cost, pick the one with fewer cross continent shipments.
//
// 3.  For simplicity, consider all countries in the same continent have the same cost for same continent shipments
//     and all cross continent shipments have the same cost for cross continent shipments.

// Naive solution:
// 1. Get most out of same country
// 2. Get most out of same continent
// 3. Get the rest of other warehouses
//
// Step 1 should be mostly good to run but step 2, 3 does not optimize cost under the assumptions
// i.e., Cost of 1 single same continent shipment should be less than cost of 1 single continent shipment and 1 local shipment
// Cost of 10 same continent shipment may also not be as cost-efficient as 1 cross continent shipment
//
// A full DFS which exhausts all possible method is a way to go,
// but it is not optimized in terms of time if there are too many countries, warehouses and item types.
// Therefore, the task here is to
// 1. know when stop exhausting remaining solutions.
// 2. know which options should be searched first.
//
// Somehow this problem becomes a "reversed" 0-1 knapsack problem with dynamic weight
// We minimize value(cost) of items while requires items to meet required weight(items),
// as well as weight are reducing as items are picked into the bag
//
// Method:
// 0. Let n be the number of total warehouses and k be the ratio between cost of same continent and cross continent shipments.
//    Let c be the total cost possible (using all warehouses).
//    For simplicity, we assume that k must be an integer and >= 1.
// 1. Sort all warehouses in ascending cost order
//    This is just equivalent of putting local in front, same continent coming next, while the reset behind.
// 2. For cost from 1 to c (for simplicity, assume there must be a solution)
//      For all combinations fits in the cost
//          *
//          Calculate the remaining items after applying that warehouse
//          If there is a result which no items left, a solution of set of warehouse has been found
//          Store the searched combination
//          *
//
// 3. Use the set of warehouse and form the shipments
//
// Coding:
// All try to write all in functional except when some mutation is required
// I think functional style better utilize IDE's powerful type checking and helps to identify bugs easier
// Also writing functional can make reading the core part of the coding easier

//string is the bitmask representation of combination of warehouses
//bitmask indicate the selection of a warehouse, warehouses order should be using warehousesIndexOrderByCost()
//bitmask in string because I don't need calculation and to cope for number overflow when number of warehouses is large

const yourAlgo = function (order: CustomerOrder): Shipment[] {
    // Initialize
    const orderItemMap: ItemMap = itemsToItemMap(order.items);

    const searchedSet: SearchedSet = new Set();

    const warehouseIndexWithCosts = warehousesIndexOrderByCost(
        order.destination
    );

    const warehouseCostIndex = warehousesCostIndex(order.destination);

    const maxCost = warehouseIndexWithCosts.reduce(
        (total, it) => total + it.cost,
        0
    );

    // Assume that local cost = 0.1, same continent = 1 and cross continent = CROSS_CONTINENT_COST_FACTOR
    // loop through increasing cost
    // there is no 0 cost shipment
    // this for loop condition holds for our assumption k is integer >= 1, and we assume local cost 0.1
    for (let cost = 1; cost <= maxCost; cost++) {
        // get all warehouse combinations
        const combinations = getAllCombinationOfWarehouseWithinCost(
            warehouseIndexWithCosts,
            cost
        );

        // filter out ones that have been explored
        const newCombinations = combinations.filter((combination) => {
            const bitmask = indicesToBitmask(combination);
            return !searchedSet.has(bitmask);
        });

        // for all new combination of warehouses
        // return if there is a solution in it
        const newCombinationResults: CombinationResult[] = newCombinations.map(
            (combination) => {
                const remainingItems = { ...orderItemMap };
                const bitmask = indicesToBitmask(combination);
                //adding current combination to searched set
                searchedSet.add(bitmask);

                // calculate for each warehouse, the items to be provided
                combination.forEach((index) => {
                    const supply = itemsToItemMap(warehouses[index].items);
                    const consumption = getConsumption(remainingItems, supply);

                    Object.keys(consumption).forEach((item) => {
                        remainingItems[item] -= consumption[item];
                    });
                });

                // if there is a solution found
                // return required values: cost, etc.
                if (isZeroItemMap(remainingItems)) {
                    const currentCost = combination.reduce(
                        (sum, index) => warehouseCostIndex[index] + sum,
                        0
                    );
                    return {
                        isFound: true,
                        cost: currentCost,
                        combination,
                    };
                } else {
                    return {
                        isFound: false,
                        cost: maxCost,
                        combination: [],
                    };
                }
            }
        );

        // if there is more than one solution for this cost
        // compare and return the best one by
        // 1. ordering in cost
        // 2. few number of total shipments
        const foundResults = newCombinationResults.filter((it) => it.isFound);
        if (foundResults.length > 0) {
            const minCost = foundResults.sort((it) => it.cost)[0].cost;
            const resultWithMinCost = foundResults.filter(
                (it) => it.cost === minCost
            );

            // if there is more than one combination with min cost, prioritize fewer shipment count
            if (resultWithMinCost.length > 1) {
                const result = resultWithMinCost.sort(
                    (it) => it.combination.length
                )[0].combination;
                return handleShipments(result, orderItemMap);
            }
            // return the first result, if there is more than one solution for same cost and shipment count, the first in list will be returned
            const result = resultWithMinCost[0].combination;
            // return shipments
            return handleShipments(result, orderItemMap);
        }
    }

    //return all warehouse if not found at last
    return handleShipments(
        warehouseIndexWithCosts.map((it) => it.index),
        orderItemMap
    );
};

// Mocking environment/DB
const CROSS_CONTINENT_COST_FACTOR = 3;

enum Country {
    HK = "HK",
    JP = "JP",
    CN = "CN",
    US = "US",
    CA = "CA",
    FR = "FR",
    UK = "UK",
    AU = "AU",
}

enum Continent {
    ASIA,
    NA,
    EU,
    OC,
}

// I expect countries and warehouses are list without particular order
const countries: CountryDetails[] = [
    {
        name: Country.HK,
        continent: Continent.ASIA,
    },
    {
        name: Country.JP,
        continent: Continent.ASIA,
    },
    {
        name: Country.CN,
        continent: Continent.ASIA,
    },
    {
        name: Country.US,
        continent: Continent.NA,
    },
    {
        name: Country.CA,
        continent: Continent.NA,
    },
    {
        name: Country.UK,
        continent: Continent.EU,
    },
    {
        name: Country.FR,
        continent: Continent.EU,
    },
    {
        name: Country.AU,
        continent: Continent.OC,
    },
];

// I don't want to modify the 'list' nature of warehouses
// yet continent is no longer required here, so I removed it from warehouses
// leaving it will not make a difference tho
const warehouses: Warehouse[] = [
    {
        name: Country.HK,
        items: ["🍎", "🍎", "🍐"],
    },
    {
        name: Country.JP,
        items: ["🍇"],
    },
    {
        name: Country.US,
        items: ["🍇", "🍎", "🍐"],
    },
    {
        name: Country.FR,
        items: ["🍎", "🍎", "🍎"],
    },
    {
        name: Country.UK,
        items: ["🍎", "🍎", "🍎"],
    },
    {
        name: Country.AU,
        items: [
            "🍎",
            "🍎",
            "🍎",
            "🍎",
            "🍎",
            "🍎",
            "🍎",
            "🍎",
            "🍎",
            "🍐",
            "🍐",
            "🍐",
            "🍐",
            "🍐",
            "🍐",
            "🍐",
            "🍇",
            "🍇",
            "🍇",
            "🍇",
            "🍇",
            "🍇",
            "🍇",
            "🍇",
            "🍇",
        ],
    },
];

// Mock DB indexing.
// Initializing takes O(n) time but later takes O(1)
// Transversing whole list every time is not optimal
type CountryIndex = {
    [country in Country]?: number;
};

const warehousesIndex = (): CountryIndex => {
    return warehouses.reduce(
        (result, warehouse, index) => ({
            ...result,
            [warehouse.name]: index,
        }),
        {}
    );
};

const countriesIndex = (): CountryIndex => {
    return countries.reduce(
        (result, country, index) => ({
            ...result,
            [country.name]: index,
        }),
        {}
    );
};

// Core functions

const getAllCombinationOfWarehouseWithinCost = (
    warehousesIndexOrderByCost: WarehouseIndexWithCost[],
    cost: number
): number[][] => {
    const result: number[][] = [];

    warehousesIndexOrderByCost.forEach((it) => {
        if (it.cost <= cost) {
            const warehouseIndexInList = warehousesIndexOrderByCost.indexOf(it); //logically will not be -1

            //only consider items in later of the list
            const removedPreviousList = warehousesIndexOrderByCost.slice(
                warehouseIndexInList + 1
            );

            if (removedPreviousList.length > 0) {
                const remainingCombinations =
                    getAllCombinationOfWarehouseWithinCost(
                        removedPreviousList,
                        cost - it.cost
                    );

                remainingCombinations.forEach((combination) => {
                    result.push([it.index, ...combination]);
                });
            }

            result.push([it.index]);
        }
    });

    return result;
};

const handleShipments = (
    combination: number[],
    itemMap: ItemMap
): Shipment[] => {
    const result: Shipment[] = [];
    combination.forEach((index) => {
        const warehouse = warehouses[index];
        const consumption = getConsumption(
            itemMap,
            itemsToItemMap(warehouse.items)
        );
        Object.keys(consumption).forEach((item) => {
            //not writing functional here because I am mutating warehouse
            for (let i = 0; i < consumption[item]; i++) {
                const index = warehouse.items.indexOf(item);
                if (index > -1) {
                    warehouse.items.splice(index, 1);
                }
                itemMap[item] -= 1;
            }
        });
        result.push({
            items: itemMapToList(consumption),
            fromWarehouse: warehouse,
        });
    });
    return result;
};

// Util functions
const itemsByCountReducer = (
    items: { [name: string]: number },
    item: string
) => ({
    ...items,
    [item]: (items[item] || 0) + 1,
});

const getConsumption = (request: ItemMap, supply: ItemMap): ItemMap => {
    return Object.keys(request).reduce(
        (result, item) => ({
            ...result,
            [item]: Math.min(
                request[item] ? request[item] : 0,
                supply[item] ? supply[item] : 0
            ),
        }),
        {}
    );
};

const itemMapToList = (itemMap: ItemMap): string[] => {
    return Object.keys(itemMap).reduce(
        (items, item) => [...items, ...Array(itemMap[item]).fill(item)],
        []
    );
};

type WarehouseIndexWithCost = {
    cost: number;
    index: number;
};

const warehousesIndexOrderByCost = (
    destination: Country
): WarehouseIndexWithCost[] => {
    const warehousesIdx = warehousesIndex();
    const countriesIdx = countriesIndex();
    const indexMapper = (it: Warehouse) => warehousesIdx[it.name];
    const indexCostMapper = (
        index: number,
        cost: number
    ): WarehouseIndexWithCost => ({ index, cost });
    const localWarehouse = warehouses
        .filter((warehouse) => warehouse.name == destination)
        .map(indexMapper)
        .map((index) => indexCostMapper(index, 0.1));
    const continent = countries[countriesIdx[destination]].continent;
    const sameContinentWarehouses = warehouses
        .filter(
            (warehouse) =>
                warehouse.name !== destination &&
                continent === countries[countriesIdx[warehouse.name]].continent
        )
        .map(indexMapper)
        .map((index) => indexCostMapper(index, 1));
    const crossContinentWarehouses = warehouses
        .filter(
            (warehouse) =>
                continent !== countries[countriesIdx[warehouse.name]].continent
        )
        .map(indexMapper)
        .map((index) => indexCostMapper(index, CROSS_CONTINENT_COST_FACTOR));

    return [
        ...localWarehouse,
        ...sameContinentWarehouses,
        ...crossContinentWarehouses,
    ];
};

type WarehouseCostIndex = { [idx: number]: number };

const warehousesCostIndex = (destination: Country): WarehouseCostIndex => {
    const countriesIdx = countriesIndex();
    const continent = countries[countriesIdx[destination]].continent;
    return warehouses.reduce(
        (result, warehouse, index) => ({
            ...result,
            [index]:
                warehouse.name == destination
                    ? 0.1
                    : continent ===
                      countries[countriesIdx[warehouse.name]].continent
                    ? 1
                    : CROSS_CONTINENT_COST_FACTOR,
        }),
        {}
    );
};

const indicesToBitmask = (indices: number[]): string => {
    if (indices.length == 0) {
        return "";
    }
    const max = Math.max(...indices);
    const set = new Set(indices);
    let result = "";
    for (let i = 0; i <= max; i++) {
        if (set.has(max - i)) {
            result = "1" + result;
        } else {
            result = "0" + result;
        }
    }
    return result;
};

const itemsToItemMap = (items: string[]): ItemMap => {
    return items.reduce(itemsByCountReducer, {});
};

const isZeroItemMap = (itemMap: ItemMap): boolean => {
    return Object.keys(itemMap).reduce(
        (isZero, item) => isZero && itemMap[item] === 0,
        true
    );
};

// Tests
const testOrders = [
    {
        destination: "HK",
        items: ["🍎", "🍎"],
        shipments: [] as Shipment[],
        note: "Expect 1 shipment from HK, because all requested items are available in HK.",
    },
    {
        destination: "CN",
        items: ["🍇"],
        shipments: [] as Shipment[],
        note: "Expect 1 shipment from JP, because it is the closest warehouse compare to US. (In the same continent.)",
    },
    {
        destination: "HK",
        items: ["🍇", "🍎"],
        shipments: [] as Shipment[],
        note: "Expect to ship 1 from HK and 1 from JP as US is further away",
    },
    {
        destination: "UK",
        items: ["🍇", "🍎"],
        shipments: [] as Shipment[],
        note: "Expect to ship only from US as 1 shipment is better than 2 shipment from HK and JP",
    },
    {
        destination: "FR",
        items: ["🍎", "🍎", "🍎", "🍎", "🍎", "🍎"],
        shipments: [] as Shipment[],
        note: "Expect to ship from UK and FR",
    },
    {
        destination: "FR",
        items: ["🍎", "🍎", "🍎", "🍎", "🍎", "🍎", "🍎"],
        shipments: [] as Shipment[],
        note: "Expect to ship once from AU instead of combination of UK, FR and others",
    },
];
/*
 * Your test ends here. Bootstrap the app.
 */

Vue.createApp({
    data() {
        return {
            warehouses,
            customerOrders: testOrders,
        };
    },
    methods: {
        prepare: yourAlgo,
        reset: function () {
            // Reset warehouse and order data
            this.customerOrders.forEach((order) => {
                order.shipments.forEach((shipment) => {
                    this.warehouses
                        .filter((warehouse) => {
                            return (
                                warehouse.name === shipment.fromWarehouse.name
                            );
                        })[0]
                        .items.push(...shipment.items);
                });

                order.shipments = [];
            });
        },
    },
}).mount("#the-app");
