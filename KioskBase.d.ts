export default class KioskBase {
    constructor();

    getOPs(): Promise<OP[]>;

    getScheduleCalls(op: number): Promise<ScheduleCall[]>;

    searchStaff(text: string): Staff | null;
}

export class ScheduleCall {
    op_number: number;
    pair_number: number;
    first_start: string;
    first_end: string;
    second_start: string;
    second_end: string;
}

export class OP {
    id: number;
    name: string;
    address: string;
}

export class Staff {
    id: number;
    op: number;
    name: string;
    email: string;
    post: string;
    cab: string;
    phone: string;
    admin: 0 | 1;
}