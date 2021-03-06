import {CashFlow} from '../services/resources';
import moment from 'moment';

const state = {
    cashFlows: null,
    firstMonthYear: null,
    cashFlowsMonthly: null
};

const mutations = {
    set(state, cashFlows){
        state.cashFlows = cashFlows;
    },
    setMonthly(state, cashFlowsMonthly){
        state.cashFlowsMonthly = cashFlowsMonthly;
    },
    setFirstMonthYear(state, date){
        state.firstMonthYear = moment(date)
            .startOf('day')
            .subtract(1, 'months').format('YYYY-MM');
    }
};

const actions = {
    query(context){
        return CashFlow.query().then(response => {
            context.commit('set', response.data);
        })
    },
    monthly(context){
        return CashFlow.monthly().then(response => {
            context.commit('setMonthly', response.data);
        })
    }
};

const getters = {
        indexSecondMonth(state, getters){
            return getters.hasFirstMonthYear ? 1 : 0;
        },
        filterMonthYear: (state) => (monthYear) => {
            if (state.cashFlows.hasOwnProperty('period_list')) {
                return state.cashFlows.period_list.filter((item) => {
                    return item.period == monthYear;
                })
            }
            return [];
        },
        hasFirstMonthYear(state, getters){
            return getters.filterMonthYear(state.firstMonthYear).length > 0;
        },
        firstBalance(state, getters){
            let balanceBeforeFirstMonth = state.cashFlows.balance_before_first_month;
            let balanceFirstMonth = 0;

            if (getters.hasFirstMonthYear) {
                let firstMonthYear = getters.filterMonthYear(state.firstMonthYear);
                balanceFirstMonth = firstMonthYear[0].revenues.total - firstMonthYear[0].expenses.total;
            }
            return balanceBeforeFirstMonth + balanceFirstMonth;
        },
        secondBalance(state, getters){
            let firstBalance = getters.firstBalance;
            let indexSecondMonth = getters.indexSecondMonth;
            let secondMonthYear = state.cashFlows.period_list[indexSecondMonth].period;
            let secondMonthObj = getters.filterMonthYear(secondMonthYear)[0];

            return getters.firstBalance + secondMonthObj.revenues.total - secondMonthObj.expenses.total;
        },
        monthsListBalanceFinal(state, getters){
            let length = state.cashFlows.period_list.length;
            return state.cashFlows.period_list.slice(getters.indexSecondMonth + 1, length);
        },
        hasCashFlows(state){
            return state.cashFlows != null && state.cashFlows.period_list.length > 1;
        },
        hasCashFlowsMonthly(state){
            return state.cashFlowsMonthly != null && state.cashFlowsMonthly.period_list.length > 0;
        },
        balance: (state, getters) => (index) => {
            return getters._calculateBalance(index + getters.indexSecondMonth + 1);
        },
        _calculateBalance: (state, getters) => (index) => {
            let indexSecondMonth = getters.indexSecondMonth;
            let previousIndex = index - 1;
            let previousBalance = 0;
            switch (previousIndex) {
                case 0:
                    previousBalance = indexSecondMonth === 0 ? getters.secondBalance : getters.firstBalance;
                    break;
                case 1:
                    previousBalance = indexSecondMonth === 1 ? getters.secondBalance : getters._calculateBalance(previousIndex);
                    break;
                default:
                    previousBalance = getters._calculateBalance(previousIndex);
            }

            let monthYear = state.cashFlows.period_list[index].period;
            let monthObj = getters.filterMonthYear(monthYear)[0];
            return previousBalance + monthObj.revenues.total - monthObj.expenses.total;
        },
        categoryTotal: (state,getters) => (category,monthYear) => {
            let monthYearResult = category.periods.filter(item => {
                return item.period == monthYear;
            });
            return monthYearResult.length === 0 ? {total: ""} : monthYearResult[0];
        }
    };

const module = {
    namespaced: true,
    state,
    mutations,
    actions,
    getters
};

export default module;
