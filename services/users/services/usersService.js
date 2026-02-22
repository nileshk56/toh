const dynamo = require('../db/dynamo');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');

const TABLE = 'users';

// Create User
const createUser = async ({ firstname, lastname, email, password, gender, dob }) => {
    const hashedPwd = await bcrypt.hash(password, 10);
    const user = { uid: nanoid(13), firstname, lastname, email, password: hashedPwd, gender, dob };
    console.log('Creating user:', user);
    try {
        await dynamo.put({ TableName: TABLE, Item: user }).promise();
    } catch (err) {
        throw err;
    }
    return user;
};

// Get User by Email
const getUserByEmail = async (email) => {
    const result = await dynamo.query({
        TableName: TABLE,
        IndexName: 'emailIndex',             // use the GSI
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email }
    }).promise();

    return result.Items[0];                 // returns the first matching user
};


// Get User by ID
const getUserByUid = async (uid) => {
    const result = await dynamo.get({ TableName: TABLE, Key: { uid } }).promise();
    return result.Item;
};

// Update User
const updateUserByUid = async (uid, data) => {
    const updates = [];
    const values = {};
    const names = {};

    Object.entries(data).forEach(([key, value], index) => {
        const valueKey = `:v${index}`;
        const nameKey = `#k${index}`;
        names[nameKey] = key;
        values[valueKey] = value;
        updates.push(`${nameKey} = ${valueKey}`);
    });

    await dynamo.update({
        TableName: TABLE,
        Key: { uid },
        UpdateExpression: `set ${updates.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
    }).promise();

    return await getUserByUid(uid);
};

// Delete User
const deleteUser = async (id) => {
    await dynamo.delete({ TableName: TABLE, Key: { id } }).promise();
    return { id };
};

const searchUsersByName = async (firstName, lastNamePrefix) => {
    console.log(    'Searching users with firstName:', firstName, 'and lastNamePrefix:', lastNamePrefix);
    if (!firstName || !lastNamePrefix) {
        throw new Error("Both firstName and lastNamePrefix are required");
    }

    // normalize
    const fn = firstName.toLowerCase().trim();
    const ln = lastNamePrefix.toLowerCase().trim();

    const params = {
        TableName: TABLE,
        IndexName: 'firstname-lastname-index', // GSI with PK: firstName, SK: lastName
        KeyConditionExpression: 'firstname = :fn AND begins_with(lastname, :ln)',
        ExpressionAttributeValues: {
            ':fn': fn,
            ':ln': ln
        }
    };

    try {
        const result = await dynamo.query(params).promise(); // v2 syntax
        return result.Items || [];
    } catch (error) {
        console.error('DynamoDB query error:', error);
        throw error;
    }
};

module.exports = { createUser, getUserByEmail, getUserByUid, updateUserByUid, deleteUser, searchUsersByName };
