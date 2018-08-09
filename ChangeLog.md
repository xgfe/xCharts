# ChangeLog
# 0.3.2

- resize:[fix] Handle asynchronous errors

# 0.3.1

- line:[fix] invalid data in series, fail to pain
- line:[feature] add peekPoint, to show peeks
- line:[optimize] add middleTick to create bandScale in line
- axis:[optimize] calculate width more precise when determine ticks to show on X axis
- update d3 dependence

# 0.2.2

- tooltip:[optimize] When the height exceeds maximum height, display optimization
- tooltip:[fix] legend&tooltip coordinate error,legend click tooltip not change
- resize:[fix] refresh error
- bar:[feature] Add background is used to distinguish between each block
- axis:[fix] legendShow=false, max value error