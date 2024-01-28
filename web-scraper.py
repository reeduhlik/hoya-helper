import requests
from datetime import datetime, timedelta, timezone
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re
from pymongo import MongoClient
def get_sitemap_urls(sitemap_urls, initial_pull = False):
    urls_to_update = []
    for sitemap_url in sitemap_urls:
        #print("On sitemap: " + sitemap_url)
        try:
            # Make a GET request to the sitemap URL
            response = requests.get(sitemap_url)
            response.raise_for_status()  # Check for errors in the HTTP response


            # Parse the XML content
            root = ET.fromstring(response.content)


            # Extract URLs and last modified dates from the sitemap
            for url_entry in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}url"):
                url = url_entry.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc").text.strip()
                lastmod_element = url_entry.find("{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod")
                lastmod = lastmod_element.text.strip() if lastmod_element is not None else None


                if lastmod:
                    # Convert lastmod string to datetime object
                    lastmod_datetime = datetime.strptime(lastmod, "%Y-%m-%dT%H:%M:%S%z")


                    # For recurring RAG use cases, append to the list urls that updated in the past day
                    if not initial_pull:
                        if (datetime.now(timezone.utc) - lastmod_datetime)  <= timedelta(days=1):
                            urls_to_update.append(url)
                    else:
                        urls_to_update.append(url)
       
        except requests.exceptions.RequestException as e:
            print(f"Error fetching sitemap: {e}")


    return urls_to_update




def fetch_site_data(urls_to_update):
    content = {}
    itemNum = 0;

    for url in urls_to_update:
        #print("On url: " + url)
        print("On item: " + str(itemNum) + " of " + str(len(urls_to_update)))
        try:
            # Make a GET request to the URL
            response = requests.get(url)
            response.raise_for_status()  # Check for errors in the HTTP response


            # Use BeautifulSoup to parse the HTML content
            soup = BeautifulSoup(response.content, 'html.parser')


            # Extract the main content of the page
            #main_content = soup.find_all('div', class_='text-container')
            main_content = soup.find_all(lambda tag: (tag.name == 'div' or tag.name == 'main') and ('text-container' in tag.get('class', []) or 'main-content' in tag.get('id', [])))


            if main_content:
                # Extract only the text content from each selected div

                print("Found main content")
                main_content_texts = [element.text.strip() for element in main_content]


                # Join the texts into a single string
                main_content = ' '.join(main_content_texts)


                # Clean up the main content
                main_content = main_content.replace('\n', ' ').replace('\r', '').replace('\xa0', ' ')
                main_content = re.sub(r'\s+', ' ', main_content).strip()


                # Return the extracted data as a dictionary
                content[url] = main_content
            else:
                print("No main content found")

        except requests.exceptions.RequestException as e:
            print(f"Error fetching data from {url}: {e}")
        
        itemNum += 1


    return content


def pull_AI_Search_data(sitemap_urls, initial_pull = False):
    # Get URLs of sites (by default only those recently updated)
    urls_to_update = get_sitemap_urls(sitemap_urls, initial_pull)


    # Fetch site data from URLs
    content = fetch_site_data(urls_to_update)


    #output dictionary keyed by each url, with value of its main text content
    return content






sitemap_urls = ["https://www.georgetown.edu/page-sitemap.xml", "https://uadmissions.georgetown.edu/page-sitemap.xml", "https://finaid.georgetown.edu/page-sitemap.xml", "https://bulletin.georgetown.edu/page-sitemap.xml"]

content = pull_AI_Search_data(sitemap_urls = sitemap_urls, initial_pull= True)


# Print or process the extracted content as needed
#print(content)



# Set up the connection
client = MongoClient('mongodb://hoya-hacks-ru:G8G3MaV9OCa3iuZNhxTfRWhST6W6Kcbfwy1aFA8XR4VEOBqmcDWtOq946qZHHbUIEDtOTKe1oBYJACDbF96VAg==@hoya-hacks-ru.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&replicaSet=globaldb&maxIdleTimeMS=120000&appName=@hoya-hacks-ru@')

# Access the database
db = client['hoya-hacks-db-final']

#client.drop_database('hoya-hacks-final-db')

# Access the collection
collection = db['webdatav2']

#empty the collection
collection.delete_many({})

#insert all of the content into the collection


#rename the _id field to url
#collection.update_many({}, {"$rename": {"_id": "id"}})

indexedKey = 0

for key in content:
    collection.insert_one({"url": key, "key": indexedKey,  "content": content[key]})
    indexedKey += 1

#display all documents in collection


# Perform operations on the collection
# ...

# Close the connection
client.close()
