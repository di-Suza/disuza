const truthy = Boolean;

export const cn = (...classes: Array<string | false | null | undefined>): string => classes.filter(truthy).join(' ');
