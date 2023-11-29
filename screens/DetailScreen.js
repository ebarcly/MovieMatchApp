import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { View, Text, ScrollView, Image, ActivityIndicator } from 'react-native';
import { fetchDetailsById } from '../services/api';

const DetailScreen = ({ route }) => {
    const { id, type } = route.params;
    const [detailData, setDetailData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await fetchDetailsById(id, type);
                setDetailData(data);
            } catch (e) {
                setError('Unable to fetch details.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, type]);

    if (loading) {
        return <ActivityIndicator size="large" />;
    }

    if (error) {
        return <Text>{error}</Text>;
    }

    return (
        <ScrollView>
            {detailData && (
                <View>
                    <Image
                        source={{ uri: `https://image.tmdb.org/t/p/w500${detailData.poster_path}` }}
                        style={{ width: '100%', height: 300 }}
                    />
                    <Text>{detailData.title || detailData.name}</Text>
                    {/* Display other details like overview, genres, etc. */}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 18,
        color: 'red',
    },
});

export default DetailScreen;
