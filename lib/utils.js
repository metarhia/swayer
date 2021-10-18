export function asyncIterable () {
    let i = 0;
    return {
        next: () => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        value: this[i],
                        done: i++ === this.length,
                    });
                }, 0);
            });
        },
    };
}
